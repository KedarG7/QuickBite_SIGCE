import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "../models/User.js";

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (!roles.includes(role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

