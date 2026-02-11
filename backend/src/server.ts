// backend/src/server.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { signToken, signAccountToken } from "./auth";
import { requireAuth, requireAccountAuth, optionalAccountAuth } from "./middleware";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Resend } from "resend";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000);

const uploadsDir = 
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const DEV_EMAIL = process.env.DEV_EMAIL;

// Bootstrap (uploads + middleware)
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

//Upload
app.use("/uploads", express.static(uploadsDir));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://smashit-frontend.onrender.com",
];

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Express
app.use(express.json());

// JSON parse errors → friendly message
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

// small helper to avoid repeating try/catch everywhere
const asyncRoute =
(
  fn: (
    req: Request, 
    res: Response, 
    next: NextFunction
  ) => Promise<unknown>
) =>
(req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

type ApiErrorCode =
  | "INVALID_PAYLOAD"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_ALREADY_REGISTERED"
  | "NO_PENDING_VERIFICATION"
  | "TAC_EXPIRED"
  | "TAC_USED"
  | "INVALID_TAC"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT";

function apiError(
  res: Response, 
  status: number, 
  code: ApiErrorCode, 
  message: string, 
  extra?: Record<string, unknown>
) {
  return res.status(status).json({ code, error: message, ...(extra ?? {}) });
}

function apiOk<T>(res: Response, data: T) {
  return res.json(data);
}

// Helpers
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowMinutesLocal() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function genTac6() {
  return String (100000 + Math.floor(Math.random() * 900000));
}

function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60 * 1000);
}

async function sendTacEmail(to: string, code: string) {
  const finalTo = DEV_EMAIL ?? to;

  console.log(`[EMAIL] Sending TAC to=${finalTo} (requested=${to})`);

  if (!resend) {
    console.log(`[EMAIL] Resend not configured, skipping email send`);
    return;
  }

  await resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: finalTo,
    subject: "Your SmashIt verification code",
    html: `
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>This code expires in 10 minutes.</p>
    `,
  });
}

type AuthPayload = { userId: number; businessId: number; role: string };

// Multer (file uploads)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});
const upload = multer({ storage });

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// AUTH ACCOUNT
const RegisterSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  address: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
});

// Auth Register
app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) 
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");

    const { businessName, email, password, address, state, city, postcode, phone } = 
      parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) 
      return apiError(res, 409, "CONFLICT", "Email alrady registered");

    const base = slugify(businessName) || "business";
    let slug = base;
    let i = 1;
    while (await prisma.business.findUnique({ where: { slug } })) slug = `${base}-${++i}`;

    const passwordHash = await bcrypt.hash(password, 10);

    const business = await prisma.business.create({
      data: {
        name: businessName,
        slug,
        address: address ?? null,
        state: state ?? null,
        city: city ?? null,
        postcode: postcode ?? null,
        phone: phone ?? null,
      },
    });

    const user = await prisma.user.create({
      data: { email, passwordHash, role: "OWNER", businessId: business.id },
    });

    const token = signToken({ 
      userId: user.id, 
      businessId: business.id, 
      role: user.role });

    return apiOk(res, {
      token,
      business: { id: business.id, name: business.name, slug: business.slug },
      user: { id: user.id, email: user.email, role: user.role },
    });
  })
);

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Auth Login
app.post(
  "/api/account/login",
  asyncRoute(async (req, res) => {
    const parsed = AccountLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const account = await prisma.account.findUnique({ where: { email } });

    if (!account) {
      const pending = await prisma.pendingAccount.findUnique({ where: { email } });

      if (pending && !pending.usedAt) {
        if (pending.expiresAt <= new Date()) {
          return apiError(
            res,
            403,
            "EMAIL_NOT_VERIFIED",
            "Email not verified. TAC expired. Please resend TAC.",
            { email }
          );
        }

        return apiError(
          res,
          403,
          "EMAIL_NOT_VERIFIED",
          "Email not verified. Please verify your email first.",
          { email }
        );
      }

      return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (!account.isEmailVerified) {
      return apiError(
        res,
        403,
        "EMAIL_NOT_VERIFIED",
        "Email not verified. Please verify your email first.",
        { email: account.email }
      );
    }

    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) {
      return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const token = signAccountToken(account.id, account.role);

    return res.json({
      token,
      account: {
        id: account.id,
        email: account.email,
        role: account.role,
        name: account.name,
        phone: account.phone,
        createdAt: account.createdAt,
        isEmailVerified: account.isEmailVerified,
      },
    });
  })
);

app.post("/api/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { business: true },
  });

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  });

  res.json({
    token,
    business: {
      id: user.business.id,
      name: user.business.name,
      slug: user.business.slug,
    },
    user: { id: user.id, email: user.email, role: user.role },
  });
});


// Auth retrieve
app.get(
  "/api/auth/me",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { userId, businessId } = (req as unknown as { auth: AuthPayload }).auth;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, businessId: true },
    });

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    if (!user || !business) 
      return apiError(res, 401, "UNAUTHORIZED", "Not authorized");

    return apiOk(res, { user, business });
  })
);

// CUSTOMER ACCOUNTS (email + password)
const AccountRegisterSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(6),
});

app.post(
  "/api/account/register",
  asyncRoute(async (req, res) => {
    const parsed = AccountRegisterSchema.safeParse(req.body);
    if (!parsed.success) 
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");

    const name = parsed.data.name.trim();
    const phone = parsed.data.phone.trim();
    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) 
      return apiError(res, 409, "EMAIL_ALREADY_REGISTERED", "Email already registered");

    const passwordHash = await bcrypt.hash(password, 10);

    const code = genTac6();
    const tacHash = await bcrypt.hash(code, 10);
    console.log(`[DEV] Email TAC for ${email}: ${code}`);
    const expiresAt = minutesFromNow(10);

    const pending = await prisma.pendingAccount.upsert({
      where: { email }, 
      update: {
        name,
        phone,
        passwordHash,
        tacHash,
        expiresAt,
        usedAt: null,
      },
      create: {
        email,
        name,
        phone,
        passwordHash,
        tacHash,
        expiresAt,
      },
      select: { id: true, email: true, name: true, phone: true, expiresAt: true },
    });

    await sendTacEmail(email, code);

    res.status(201).json({
      ok: true,
      message: "TAC sent to email. Please verify to activate your account.",
      pending: {
        email: pending.email,
        name: pending.name,
        phone: pending.phone,
        expiresAt: pending.expiresAt,
      },
    });
  })
);


const VerifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

app.post(
  "/api/account/verify-email",
  asyncRoute(async (req, res) => {
    const parsed = VerifyEmailSchema.safeParse(req.body);
    if (!parsed.success) 
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");

    const email = parsed.data.email.toLowerCase().trim();
    const code = parsed.data.code.trim();

    const pending = await prisma.pendingAccount.findUnique({ where: { email } });
    if (!pending)
      return apiError(res, 404, "NO_PENDING_VERIFICATION", "No pending verification found");

    if (pending.usedAt)
      return apiError(res, 400, "TAC_USED", "This TAC has already been used. Please resend TAC.");

    if (pending.expiresAt <= new Date())
      return apiError(res, 400, "TAC_EXPIRED", "TAC expired. Please resend TAC.");

    const ok = await bcrypt.compare(code, pending.tacHash);
    if (!ok) return apiError(res, 401, "INVALID_TAC", "Invalid TAC code");

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.account.findUnique({ where: { email } });

      if (existing) {
        const updated = await tx.account.update({
          where: { id: existing.id },
          data: { isEmailVerified: true },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
            isEmailVerified: true,
          },
        });

        await tx.pendingAccount.update({
          where: { email },
          data: { usedAt: new Date() },
        });

        return { kind: "verified_existing" as const, account: updated };
      }

      const created = await tx.account.create({
        data: {
          email: pending.email,
          name: pending.name,
          phone: pending.phone,
          passwordHash: pending.passwordHash,
          role: "USER",
          isEmailVerified: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
          isEmailVerified: true,
        },
      });

      await tx.pendingAccount.update({
        where: { email },
        data: { usedAt: new Date() },
      });

      return { kind: "created_new" as const, account: created };
    });

    const token = signAccountToken(result.account.id, result.account.role);

    return apiOk(res, {
      ok: true,
      message:
        result.kind === "created_new"
          ? "Email verified. You can now login."
          : "Email verified successfully.",
        token,
      account: result.account,
    });
  })
);

const ResendTacSchema = z.object({
  email: z.string().email(),
});

app.post(
  "/api/account/resend-tac",
  asyncRoute(async (req, res) => {
    const parsed = ResendTacSchema.safeParse(req.body);
    if (!parsed.success)
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");

    const email = parsed.data.email.toLowerCase().trim();

    const exisitng = await prisma.account.findUnique({ where: { email } });
    if (exisitng) 
      return apiOk(res, { ok: true, message: "Email already verified. Please login." });

    const pending = await prisma.pendingAccount.findUnique({ where: { email } });
    if (!pending) 
      return apiError(res, 404, "NO_PENDING_VERIFICATION", "No pending registration found");

    const code = genTac6();
    const tacHash = await bcrypt.hash(code, 10);
    console.log(`[DEV] Email TAC for ${email}: ${code}`);

    await prisma.pendingAccount.update({
      where: { email },
      data: {
        tacHash,
        expiresAt: minutesFromNow(10),
        usedAt: null,
      },
    });

    await sendTacEmail(email, code);

    return apiOk(res, { ok: true, message: "New TAC sent to email." });
  }),
);

const AccountLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post(
  "/api/account/login",
  asyncRoute(async (req, res) => {
    const parsed = AccountLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return apiError(res, 400, "INVALID_PAYLOAD", "Invalid payload");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const account = await prisma.account.findUnique({ where: { email } });

    if (account) {
      if (!account.isEmailVerified) {
        return apiError(
          res,
          403,
          "EMAIL_NOT_VERIFIED",
          "Email not verified. Please verify your email first.",
          { email: account.email }
        );
      }

      const ok = await bcrypt.compare(password, account.passwordHash);
      if (!ok) {
        return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
      }

      const token = signAccountToken(account.id, account.role);

      return apiOk(res, {
        token,
        account: {
          id: account.id,
          email: account.email,
          role: account.role,
          name: account.name,
          phone: account.phone,
          createdAt: account.createdAt,
          isEmailVerified: account.isEmailVerified,
        },
      });
    }

    const pending = await prisma.pendingAccount.findUnique({ where: { email } });

    if (!pending) {
      return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (pending.usedAt) {
      return apiError(
        res,
        403,
        "EMAIL_NOT_VERIFIED",
        "Email not verified. Please verify your email first.",
        { email }
      );
    }

    const pwOk = await bcrypt.compare(password, pending.passwordHash);
    if (!pwOk) {
      return apiError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (pending.expiresAt <= new Date()) {
      return apiError(
        res,
        403,
        "TAC_EXPIRED",
        "TAC expired. Please resend TAC.",
        { email }
      );
    }

    return apiError(
      res,
      403,
      "EMAIL_NOT_VERIFIED",
      "Email not verified. Please verify your email first.",
      { email }
    );
  })
);

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

app.post(
  "/api/account/change-password",
  requireAccountAuth,
  asyncRoute(async (req, res) => {
    const { accountId } = (req as any).accountAuth as { accountId: number };

    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid payload" });

    const { currentPassword, newPassword } = parsed.data;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, passwordHash: true },
    });

    if (!account) return res.status(401).json({ error: "Not authorized" });

    const ok = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.account.update({
      where: { id: accountId },
      data: { passwordHash: newHash },
    });

    res.json({ ok: true, message: "Password updated" });
  }),
);


app.get("/api/account/me", requireAccountAuth, asyncRoute(async (req, res) => {
    const { accountId } = (req as any).accountAuth as { accountId: number };

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        name: true, 
        phone: true, 
        isEmailVerified: true, 
        createdAt: true },
    });
    if (!account) return res.status(401).json({ error: "Not authorized" });
    res.json({ account });
  }),
);

app.get("/api/me/bookings", requireAccountAuth, asyncRoute(async (req, res) => {
    const { accountId } = (req as any).accountAuth as { accountId: number };

    const bookings = await prisma.booking.findMany({
      where: { accountId },
      orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
      include: { court: true, business: true },
    });

    res.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        businessId: b.businessId,
        courtId: b.courtId,
        date: b.date,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        customerName: b.customerName,
        phone: b.phone,
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentProof: b.paymentProof,
        court: b.court ? { id: b.court.id, name: b.court.name } : undefined,
        business: b.business ? { id: b.business.id, name: b.business.name, slug: b.business.slug } : undefined,
      })),
    });
  }),
);

const AccountUpdateSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  name: z.string().min(2).optional(),
});

app.patch(
  "/api/account/me",
  requireAccountAuth,
  asyncRoute(async (req, res) => {
    const { accountId } = (req as any).accountAuth as { accountId: number };

    const parsed = AccountUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const nextEmail = parsed.data.email ? parsed.data.email.toLowerCase().trim() : undefined;
    const nextPhone = parsed.data.phone ? parsed.data.phone.trim() : undefined;
    const nextName = parsed.data.name ? parsed.data.name.trim() : undefined;

    const current = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        passwordHash: true,
        isEmailVerified: true,
      },
    });
    if (!current) return res.status(401).json({ error: "Not authorized" });

    if (nextEmail && nextEmail !== current.email) {
      const taken = await prisma.account.findUnique({ where: { email: nextEmail } });
      if (taken && taken.id !== accountId) {
        return res.status(409).json({ error: "Email already in use" });
      }
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: {
        ...(nextName ? { name: nextName } : {}),
        ...(nextPhone ? { phone: nextPhone } : {}),
        ...(nextEmail && nextEmail !== current.email
          ? { email: nextEmail, isEmailVerified: false }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (nextEmail && nextEmail !== current.email) {
      const code = genTac6();
      const tacHash = await bcrypt.hash(code, 10);

      await prisma.pendingAccount.upsert({
        where: { email: nextEmail },
        update: {
          name: updated.name || "",    
          phone: updated.phone || "",   
          passwordHash: current.passwordHash,
          tacHash,
          expiresAt: minutesFromNow(10),
          usedAt: null,
        },
        create: {
          email: nextEmail,
          name: updated.name || "",
          phone: updated.phone || "",
          passwordHash: current.passwordHash,
          tacHash,
          expiresAt: minutesFromNow(10),
        },
      });

      await sendTacEmail(nextEmail, code);
    }

    res.json({ ok: true, account: updated });
  })
);



app.delete("/api/me/bookings/:id", requireAccountAuth, asyncRoute(async (req, res) => {
    const { accountId } = (req as any).accountAuth as { accountId: number };
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });

    const booking = await prisma.booking.findFirst({
      where: { id, accountId },
    });
    if (!booking) return res.status(404).json({ error: "booking not found" });

    await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json({ ok: true });
  }),
);

// PUBLIC: businesses + locations

// Retrieve businesses
app.get(
  "/api/public/businesses",
  asyncRoute(async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

    const where: any = {};
    if (state) where.state = state;
    if (city) where.city = city;

    const businesses = await prisma.business.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        address: true,
        phone: true,
      },
    });

    res.json(businesses);
  })
);

// Retrieve Location States Dropdown
app.get(
  "/api/public/locations/states",
  asyncRoute(async (_req, res) => {
    const rows = await prisma.business.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    });

    const states = rows
      .map((r) => (r.state ?? "").trim())
      .filter(Boolean);

    res.json(states);
  })
);

// Retrieve Location Cities Dropdown
app.get(
  "/api/public/locations/cities",
  asyncRoute(async (req, res) => {
    const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
    if (!state) return res.status(400).json({ error: "state is required" });

    const rows = await prisma.business.findMany({
      where: { state, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    });

    const cities = rows
      .map((r) => (r.city ?? "").trim())
      .filter(Boolean);

    res.json(cities);
  })
);

// ADMIN (JWT required)

// Retrieve Admin Business
app.get(
  "/api/admin/business",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    if (!business) return res.status(404).json({ error: "Business not found" });
    res.json(business);
  })
);

// Retrieve Admin Business Profile
app.get(
  "/api/admin/business/profile",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        state: true,
        city: true,
        postcode: true,
        phone: true,
        openMinutes: true,
        closeMinutes: true,
        slotMinutes: true,
        priceCents: true,
        createdAt: true,
      },
    });

    if (!business) return res.status(404).json({ error: "Business not found" });

    const isProfileComplete =
      !!business.address && !!business.state && !!business.city && !!business.postcode && !!business.phone;

    res.json({ ...business, isProfileComplete });
  })
);


// Update Admin Business Profile
app.put(
  "/api/admin/business/profile",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;

    const schema = z.object({
      address: z.string().min(3).optional(),
      state: z.string().min(2).optional(),
      city: z.string().min(2).optional(),
      postcode: z.string().min(4).optional(),
      phone: z.string().min(8).optional(),
      openMinutes: z.number().int().min(0).max(1439).optional(),
      closeMinutes: z.number().int().min(1).max(1440).optional(),
      slotMinutes: z.number().int().min(15).max(240).optional(),
      priceCents: z.number().int().min(0).max(1_000_000).optional(),
    })
    .refine(
      (v) =>
        v.openMinutes == null ||
        v.closeMinutes == null ||
        v.closeMinutes > v.openMinutes,
        { message: "closeMinutes must be greater than openMinutes"}
    );

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid data" });
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        address: parsed.data.address ?? undefined,
        state: parsed.data.state ?? undefined,
        city: parsed.data.city ?? undefined,
        postcode: parsed.data.postcode ?? undefined,
        phone: parsed.data.phone ?? undefined,
        openMinutes: parsed.data.openMinutes ?? undefined,
        closeMinutes: parsed.data.closeMinutes ?? undefined,
        slotMinutes: parsed.data.slotMinutes ?? undefined,
        priceCents: parsed.data.priceCents ?? undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        state: true,
        city: true,
        postcode: true,
        phone: true,
        openMinutes: true,
        closeMinutes: true,
        slotMinutes: true,
        priceCents: true,
      },
    });

    res.json(updated);
  })
);

// ---- Courts (admin)
const CreateCourtSchema = z.object({ name: z.string().min(2) });
const UpdateCourtSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

// Retrieve Admin Courts
app.get(
  "/api/admin/courts",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const courts = await prisma.court.findMany({ where: { businessId }, orderBy: { id: "asc" } });
    res.json(courts);
  })
);

// Create new Admin Courts
app.post(
  "/api/admin/courts",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;

    const parsed = CreateCourtSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const court = await prisma.court.create({
      data: { name: parsed.data.name, businessId, isActive: true },
    });

    res.status(201).json(court);
  })
);

// Update Admin Courts Detail
app.put(
  "/api/admin/courts/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid court id" });

    const parsed = UpdateCourtSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const existing = await prisma.court.findUnique({ where: { id } });
    if (!existing || existing.businessId !== businessId) {
      return res.status(404).json({ error: "Court not found" });
    }

    const updated = await prisma.court.update({
      where: { id },
      data: {
        ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
        ...(parsed.data.isActive != null ? { isActive: parsed.data.isActive } : {}),
      },
    });

    res.json(updated);
  })
);

// Retrieve court booking
app.get(
  "/api/admin/bookings",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const date = String(req.query.date || "");
    if (!date) return res.status(400).json({ error: "date required (YYYY-MM-DD)" });

    const bookings = await prisma.booking.findMany({
      where: { businessId, date, status: { not: "CANCELLED" } },
      include: { court: true },
      orderBy: { startMinutes: "asc" },
    });

    res.json(bookings);
  })
);

// ADMIN

// Update verify for booking payment transaction
app.patch(
  "/api/admin/bookings/:id/verify-payment",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const id = Number(req.params.id);

    const booking = await prisma.booking.findFirst({ where: { id, businessId } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const updated = await prisma.booking.update({
      where: { id },
      data: { paymentStatus: "VERIFIED" },
      select: { id: true, paymentStatus: true },
    });

    res.json(updated);
  })
);

// Update reject for booking payment transaction
app.patch(
  "/api/admin/bookings/:id/reject-payment",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid booking id" });

    const booking = await prisma.booking.findFirst({ where: { id, businessId } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const updated = await prisma.booking.update({
      where: { id },
      data: { paymentStatus: "REJECTED" },
      select: { id: true, paymentStatus: true },
    });

    res.json(updated);
  })
);

// Delete booking
app.delete(
  "/api/admin/bookings/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { businessId } = (req as any).auth as AuthPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid booking id" });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.businessId !== businessId) {
      return res.status(404).json({ error: "Booking not found" });
    }

    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ success: true });
  })
);

// PUBLIC CUSTOMER

// Upload payment proof (public, by bookingId + phone)
app.post(
  "/api/public/bookings/:id/payment-proof",
  upload.single("file"),
  asyncRoute(async (req, res) => {
    const bookingId = Number(req.params.id);
    const phone = String(req.body.phone || "").trim();

    if (!Number.isFinite(bookingId)) return res.status(400).json({ error: "Invalid booking id" });
    if (!phone) return res.status(400).json({ error: "phone is required" });
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.phone !== phone) return res.status(403).json({ error: "Phone does not match this booking" });

    const proofUrl = `/uploads/${req.file.filename}`;

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentProof: proofUrl, paymentStatus: "SUBMITTED" },
    });

    res.json({ ok: true, paymentProof: proofUrl });
  })
);

// PUBLIC CUSTOMER (by business slug)

// Retrieve court by business slug
app.get(
  "/api/b/:slug/courts",
  asyncRoute(async (req, res) => {
    const slug = String(req.params.slug);

    const biz = await prisma.business.findUnique({ where: { slug } });
    if (!biz) return res.status(404).json({ error: "Business not found" });

    const courts = await prisma.court.findMany({
      where: { businessId: biz.id, isActive: true },
      orderBy: { id: "asc" },
    });

    res.json({
      business: { 
        id: biz.id, 
        name: biz.name, 
        slug: biz.slug,
        openMinutes: biz.openMinutes,
        closeMinutes: biz.closeMinutes,
        slotMinutes: biz.slotMinutes,
        priceCents: biz.priceCents ?? 0,
      },
      courts,
    });
  })
);

// Retrieve available court by business
app.get(
  "/api/b/:slug/availability",
  asyncRoute(async (req, res) => {
    const slug = String(req.params.slug);
    const date = String(req.query.date || "");
    if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

    const biz = await prisma.business.findUnique({ where: { slug } });
    if (!biz) return res.status(404).json({ error: "Business not found" });

    const bookings = await prisma.booking.findMany({
      where: { businessId: biz.id, date, status: "CONFIRMED" },
      select: { id: true, courtId: true, startMinutes: true, endMinutes: true },
    });

    res.json({ date, bookings });
  })
);

const PublicCreateBookingSchema = z.object({
  courtId: z.number().int().positive(),
  date: z.string().min(8),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
  customerName: z.string().min(1),
  phone: z.string().min(6),
});

// Book a court
app.post("/api/b/:slug/bookings", optionalAccountAuth, asyncRoute(async (req, res) => {
    const slug = String(req.params.slug);

    const biz = await prisma.business.findUnique({ where: { slug } });
    if (!biz) return res.status(404).json({ error: "Business not found" });

    const parsed = PublicCreateBookingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

    const { courtId, date, startMinutes, endMinutes, customerName, phone } = parsed.data;
    if (endMinutes <= startMinutes) return res.status(400).json({ error: "Invalid time range" });

    if (startMinutes < biz.openMinutes || endMinutes > biz.closeMinutes) {
      return res.status(400).json({
        error: `Booking must be within business hours (${biz.openMinutes}-${biz.closeMinutes})`,
      });
    }

    const slot = biz.slotMinutes || 60;
    if (startMinutes % slot !== 0 || endMinutes % slot !== 0) {
      return res.status(400).json({ error: `Time must align to ${slot}-minute slots` });
    }
    if (endMinutes - startMinutes !== slot) {
      return res.status(400).json({ error: `Booking duration must be ${slot} minutes` });
    }

    const today = todayYYYYMMDD();
    if (date < today) return res.status(400).json({ error: "Cannot book a past date" });
    if (date === today && startMinutes <= nowMinutesLocal()) {
      return res.status(400).json({ error: "Cannot book a past time slot" });
    }

    const court = await prisma.court.findUnique({ where: { id: courtId } });
    if (!court || court.businessId !== biz.id) return res.status(400).json({ error: "Invalid court" });

    const conflict = await prisma.booking.findFirst({
      where: {
        businessId: biz.id,
        courtId,
        date,
        status: "CONFIRMED",
        AND: [{ startMinutes: { lt: endMinutes } }, { endMinutes: { gt: startMinutes } }],
      },
    });
    if (conflict) return res.status(409).json({ error: "Time slot already booked" });

    const accountId = (req as any).accountAuth?.accountId as (number | undefined);

    const booking = await prisma.booking.create({
      data: {
        businessId: biz.id,
        courtId,
        date,
        startMinutes,
        endMinutes,
        customerName,
        phone,
        status: "CONFIRMED",
        ...(accountId ? { accountId } : {}),
      },
    });

    res.status(201).json(booking);
  })
);

// Retrieve booking by number phone or name
app.get(
  "/api/b/:slug/my-bookings",
  asyncRoute(async (req, res) => {
    const slug = req.params.slug;
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    if (!phone && !name) return res.status(400).json({ error: "phone or name is required" });

    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const bookings = await prisma.booking.findMany({
      where: {
        businessId: business.id,
        accountId: null,
        ...(phone ? { phone } : {}),
        ...(name ? { customerName: { contains: name } } : {}),
      },
      orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
      include: { court: true, business: true },
    });

    res.json({
      business: { name: business.name, slug: business.slug },
      bookings: bookings.map((b) => ({
        id: b.id,
        courtId: b.courtId,
        date: b.date,
        startMinutes: b.startMinutes,
        endMinutes: b.endMinutes,
        customerName: b.customerName,
        phone: b.phone,
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentProof: b.paymentProof,
        court: { id: b.court.id, name: b.court.name },
        business: b.business ? { id: b.business.id, name: b.business.name, slug: b.business.slug } : undefined,
      })),
    });
  })
);

// Delete booking by number phone or name
app.delete(
  "/api/b/:slug/my-bookings/:id",
  asyncRoute(async (req, res) => {
    const slug = req.params.slug;
    const id = Number(req.params.id);
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";

    if (!phone) return res.status(400).json({ error: "phone is required" });
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const business = await prisma.business.findUnique({ where: { slug } });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const booking = await prisma.booking.findFirst({ 
      where: { 
        id, 
        businessId: business.id, 
        phone,
        accountId: null,
      }, 
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ ok: true });
  })
);

// API 404 (JSON)
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

// Global error handler (JSON)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
