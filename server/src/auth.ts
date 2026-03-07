import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type AuthUser = {
  userId: number;
  email: string;
};

type AuthPayload = {
  sub: string;
  email: string;
};

export function createAuthToken(user: { id: number; email: string }): string {
  return jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, {
    expiresIn: "7d"
  });
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export type AuthedRequest = Request & {
  authUser: AuthUser;
};

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = readBearerToken(req);

  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const userId = Number(payload.sub);

    if (!payload.email || Number.isNaN(userId)) {
      res.status(401).json({ message: "Invalid token." });
      return;
    }

    (req as AuthedRequest).authUser = {
      userId,
      email: payload.email
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}
