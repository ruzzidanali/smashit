import jwt from "jsonwebtoken";

export type AuthUser = { userId: number; businessId: number; role: string };

export function signToken(payload: AuthUser) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in .env");
  return jwt.verify(token, secret) as AuthUser;
}
