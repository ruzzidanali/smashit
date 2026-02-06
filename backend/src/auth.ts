import jwt from "jsonwebtoken";

export type AuthUser = { userId: number; businessId: number; role: string };
export type AuthAccount = {
  accountId: number;
  role: "USER" | "OWNER" | "ADMIN";
  type: "ACCOUNT";
};

export function signToken(payload: AuthUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function signAccountToken(accountId: number, role: AuthAccount["role"]) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  const payload: AuthAccount = { accountId, role, type: "ACCOUNT" };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  return jwt.verify(token, secret) as AuthUser;
}

export function verifyAccountToken(token: string): AuthAccount {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  const decoded = jwt.verify(token, secret) as any;

  if (!decoded || decoded.type !== "ACCOUNT" || typeof decoded.accountId !== "number") {
    throw new Error("Not an account token");
  }
  return decoded as AuthAccount;
}
