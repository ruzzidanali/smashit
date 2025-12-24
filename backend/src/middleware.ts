import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";

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
