import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import type { AuthenticatedUser } from '../types/express';
import type { Role } from '../types/roles';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  roles: Role[];
  status: 'active' | 'inactive';
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed.' });
  }

  const token = header.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing from Authorization header.' });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  const signingSecret: Secret = secret;

  try {
    const decoded = jwt.verify(token, signingSecret);
    if (typeof decoded === 'string') {
      return res.status(401).json({ message: 'Token payload malformed.' });
    }

    const payload = decoded as JwtPayload & Partial<AccessTokenPayload>;
    if (!payload.sub) {
      return res.status(401).json({ message: 'Token missing subject.' });
    }

    const authUser: AuthenticatedUser = {
      id: payload.sub,
      roles: Array.isArray(payload.roles) ? (payload.roles as Role[]) : [],
      status: payload.status === 'inactive' ? 'inactive' : 'active',
    };

    if (authUser.status !== 'active') {
      return res.status(403).json({ message: 'User is inactive.' });
    }

    req.authUser = authUser;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.', details: error instanceof Error ? error.message : undefined });
  }
};
