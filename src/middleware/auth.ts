import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

/**
 * Requires a valid Clerk session for API routes. Returns 401 if not authenticated.
 * Must be used after clerkMiddleware(). Attach req.auth.userId for downstream routes.
 */
export function requireAuthApi(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}
