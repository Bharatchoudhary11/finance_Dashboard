import type { Request, Response } from 'express';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { User } from '../models/User';
import { toSafeUser } from '../utils/userMapper';

type TokenTtl = Exclude<SignOptions['expiresIn'], undefined>;
const tokenTtl = (process.env.JWT_TTL ?? '1h') as TokenTtl;

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'User is inactive. Contact an administrator.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable.');
  }
  const signingSecret: Secret = secret;

  const token = jwt.sign(
    {
      sub: user.id,
      roles: user.roles,
      status: user.status,
    },
    signingSecret,
    { expiresIn: tokenTtl }
  );

  return res.json({ token, user: toSafeUser(user) });
};
