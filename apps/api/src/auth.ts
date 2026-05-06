import bcrypt from 'bcryptjs';
import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';

import { db } from './db.js';
import type { AuthedRequest, AuthUser, Role } from './types.js';

const jwtSecret = process.env.JWT_SECRET ?? 'dev-andhrawala-secret';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, jwtSecret, { expiresIn: '7d' });
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'missing token' });
    return;
  }
  try {
    req.user = jwt.verify(token, jwtSecret) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'not allowed' });
      return;
    }
    next();
  };
}

export function currentUserFromPhone(phone: string): (AuthUser & { password_hash: string }) | null {
  const user = db
    .prepare('SELECT id, name, phone, password_hash, role, outlet_id FROM users WHERE phone = ?')
    .get(phone) as (AuthUser & { password_hash: string }) | undefined;
  return user ?? null;
}
