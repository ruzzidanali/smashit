import { Request, Response, NextFunction } from "express";
import { verifyToken, verifyAccountToken } from "./auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";

  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    (req as any).auth = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAccountAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : ""; // ✅ fixed (Bearer + space)

  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    (req as any).accountAuth = verifyAccountToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAccountAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return next();

  try {
    (req as any).accountAuth = verifyAccountToken(token);
  } catch {

  }
  next();
}
