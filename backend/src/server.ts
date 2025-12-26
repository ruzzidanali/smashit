// backend/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { signToken } from "./auth";
import { requireAuth } from "./middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use("/uploads", express.static(uploadsDir));
app.use(cors());
app.use(express.json());

app.use((err: any, _req: any, res: any, next: any) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

const PORT = Number(process.env.PORT || 4000);

// --------------------------------
// Helpers
// --------------------------------
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

type AuthPayload = { userId: number; businessId: number; role: string };

// --------------------------------
// Health
// --------------------------------
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// =================================
// AUTH
// =================================
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

app.post("/api/auth/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const {
    businessName,
    email,
    password,
    address,
    state,
    city,
    postcode,
    phone,
  } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return res.status(409).json({ error: "Email already registered" });

  const base = slugify(businessName) || "business";
  let slug = base;
  let i = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }

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
    data: {
      email,
      passwordHash,
      role: "OWNER",
      businessId: business.id,
    },
  });

  const token = signToken({
    userId: user.id,
    businessId: business.id,
    role: user.role,
  });

  res.json({
    token,
    business: { id: business.id, name: business.name, slug: business.slug },
    user: { id: user.id, email: user.email, role: user.role },
  });
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const { userId, businessId } = (req as any).auth as AuthPayload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, businessId: true },
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  if (!user || !business)
    return res.status(401).json({ error: "Not authorized" });
  res.json({ user, business });
});

app.get("/api/public/businesses", async (req, res) => {
  try {
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    const city =
      typeof req.query.city === "string" ? req.query.city.trim() : "";

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
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load businesses" });
  }
});

// =================================
// ADMIN (JWT required)
// =================================
app.get("/api/admin/business", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  if (!business) return res.status(404).json({ error: "Business not found" });
  res.json(business);
});

// ---- Get Profile
app.get("/api/admin/business/profile", requireAuth, async (req, res) => {
  try {
    const { businessId } = (req as any).auth;

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
        createdAt: true,
      },
    });

    if (!business) return res.status(404).json({ error: "Business not found" });
    return res.json(business);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to load profile" });
  }
});

// ---- Update Profile
app.put("/api/admin/business/profile", requireAuth, async (req, res) => {
  try {
    const { businessId } = (req as any).auth;

    const schema = z.object({
      address: z.string().min(3).optional(),
      state: z.string().min(2).optional(),
      city: z.string().min(2).optional(),
      postcode: z.string().min(4).optional(),
      phone: z.string().min(8).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid data",
      });
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        address: parsed.data.address ?? undefined,
        state: parsed.data.state ?? undefined,
        city: parsed.data.city ?? undefined,
        postcode: parsed.data.postcode ?? undefined,
        phone: parsed.data.phone ?? undefined,
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
      },
    });

    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Failed to update profile" });
  }
});

// ---- Courts
app.get("/api/admin/courts", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;

  const courts = await prisma.court.findMany({
    where: { businessId },
    orderBy: { id: "asc" },
  });

  res.json(courts);
});

const CreateCourtSchema = z.object({
  name: z.string().min(2),
});

app.post("/api/admin/courts", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;

  const parsed = CreateCourtSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const court = await prisma.court.create({
    data: { name: parsed.data.name, businessId, isActive: true },
  });

  res.status(201).json(court);
});

const UpdateCourtSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

app.put("/api/admin/courts/:id", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;
  const id = Number(req.params.id);

  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid court id" });

  const parsed = UpdateCourtSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing || existing.businessId !== businessId)
    return res.status(404).json({ error: "Court not found" });

  const updated = await prisma.court.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
      ...(parsed.data.isActive != null
        ? { isActive: parsed.data.isActive }
        : {}),
    },
  });

  res.json(updated);
});

// ---- Bookings (admin)
app.get("/api/admin/bookings", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;
  const date = String(req.query.date || "");

  if (!date)
    return res.status(400).json({ error: "date required (YYYY-MM-DD)" });

  const bookings = await prisma.booking.findMany({
    where: { businessId, date, status: "CONFIRMED" },
    include: { court: true },
    orderBy: { startMinutes: "asc" },
  });

  res.json(bookings);
});

app.delete("/api/admin/bookings/:id", requireAuth, async (req, res) => {
  const { businessId } = (req as any).auth as AuthPayload;
  const id = Number(req.params.id);

  if (!Number.isFinite(id))
    return res.status(400).json({ error: "Invalid booking id" });

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking || booking.businessId !== businessId)
    return res.status(404).json({ error: "Booking not found" });

  await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  res.json({ success: true });
});

// =================================
// PUBLIC CUSTOMER (by business slug)
// =================================
app.get("/api/b/:slug/courts", async (req, res) => {
  const slug = String(req.params.slug);

  const biz = await prisma.business.findUnique({ where: { slug } });
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const courts = await prisma.court.findMany({
    where: { businessId: biz.id, isActive: true },
    orderBy: { id: "asc" },
  });

  res.json({
    business: { id: biz.id, name: biz.name, slug: biz.slug },
    courts,
  });
});

// ✅ Availability endpoint (so UI can mark slots as taken)
app.get("/api/b/:slug/availability", async (req, res) => {
  const slug = String(req.params.slug);
  const date = String(req.query.date || "");
  if (!date)
    return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });

  const biz = await prisma.business.findUnique({ where: { slug } });
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const bookings = await prisma.booking.findMany({
    where: { businessId: biz.id, date, status: "CONFIRMED" },
    select: { id: true, courtId: true, startMinutes: true, endMinutes: true },
  });

  res.json({ date, bookings });
});

const PublicCreateBookingSchema = z.object({
  courtId: z.number().int().positive(),
  date: z.string().min(8),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
  customerName: z.string().min(1),
  phone: z.string().min(6),
});

app.post("/api/b/:slug/bookings", async (req, res) => {
  const slug = String(req.params.slug);

  const biz = await prisma.business.findUnique({ where: { slug } });
  if (!biz) return res.status(404).json({ error: "Business not found" });

  const parsed = PublicCreateBookingSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid payload" });

  const { courtId, date, startMinutes, endMinutes, customerName, phone } =
    parsed.data;

  if (endMinutes <= startMinutes)
    return res.status(400).json({ error: "Invalid time range" });

  // ✅ past date/time protection
  const today = todayYYYYMMDD();
  if (date < today)
    return res.status(400).json({ error: "Cannot book a past date" });
  if (date === today && startMinutes <= nowMinutesLocal())
    return res.status(400).json({ error: "Cannot book a past time slot" });

  // ensure court belongs to this business
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court || court.businessId !== biz.id)
    return res.status(400).json({ error: "Invalid court" });

  // overlap check
  const conflict = await prisma.booking.findFirst({
    where: {
      businessId: biz.id,
      courtId,
      date,
      status: "CONFIRMED",
      AND: [
        { startMinutes: { lt: endMinutes } },
        { endMinutes: { gt: startMinutes } },
      ],
    },
  });

  if (conflict)
    return res.status(409).json({ error: "Time slot already booked" });

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
    },
  });

  res.status(201).json(booking);
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({ storage });

app.post("/api/b/:slug/bookings/:id/payment-proof", upload.single("file"), async (req, res) => {
    try {
      const slug = req.params.slug;
      const bookingId = Number(req.params.id);

      if (!req.file) {
        return res.status(400).json({ error: "file is required" });
      }

      const business = await prisma.business.findUnique({ where: { slug } });
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, businessId: business.id },
      });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const proofUrl = `/uploads/${req.file.filename}`;

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentProof: proofUrl,
          paymentStatus: "SUBMITTED",
        },
      });

      return res.json({ ok: true, paymentProof: proofUrl });
    } catch (e: any) {
      return res.status(500).json({
        error: e?.message || "Failed to upload payment proof",
      });
    }
  }
);

// Customer: list own bookings by phone and name
app.get("/api/b/:slug/my-bookings", async (req, res) => {
  const slug = req.params.slug;
  const phone =
    typeof req.query.phone === "string" ? req.query.phone.trim() : "";
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";

  if (!phone && !name) {
    return res.status(400).json({ error: "phone or name is required" });
  }

  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: business.id,
      status: { not: "CANCELLED" },
      ...(phone ? { phone } : {}),
      ...(name ? { customerName: { contains: name } } : {}),
    },
    orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
    include: {
      court: true, // ✅ needed for court.name
      business: true, // ✅ optional if you want business name
    },
  });

  res.json({
    business: { name: business.name, slug: business.slug },
    bookings: bookings.map((b: (typeof bookings)[number]) => ({
      id: b.id,
      courtId: b.courtId,
      date: b.date,
      startMinutes: b.startMinutes,
      endMinutes: b.endMinutes,
      customerName: b.customerName,
      phone: b.phone,
      status: b.status,
      court: { id: b.court.id, name: b.court.name },
    })),
  });
});

// Customer: cancel own booking by id + phone
app.delete("/api/b/:slug/my-bookings/:id", async (req, res) => {
  const slug = req.params.slug;
  const id = Number(req.params.id);
  const phone =
    typeof req.query.phone === "string" ? req.query.phone.trim() : "";

  if (!phone) return res.status(400).json({ error: "phone is required" });
  if (!Number.isFinite(id))
    return res.status(400).json({ error: "invalid id" });

  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const booking = await prisma.booking.findFirst({
    where: { id, businessId: business.id, phone },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  res.json({ ok: true });
});

app.get("/api/public/locations/states", async (req, res) => {
  try {
    const rows = await prisma.business.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    });

    const states = rows
      .map((r: { state: string | null }) => (r.state ?? "").trim())
      .filter(Boolean);
    res.json(states);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load states" });
  }
});

app.get("/api/public/locations/cities", async (req, res) => {
  try {
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";
    if (!state) return res.status(400).json({ error: "state is required" });

    const rows = await prisma.business.findMany({
      where: { state, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    });

    const cities = rows
      .map((r: { city: string | null }) => (r.city ?? "").trim())
      .filter(Boolean);

    res.json(cities);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load cities" });
  }
});

// ✅ Optional: JSON 404 for API routes (keeps responses consistent)
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "API route not found" })
);

// Start server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
