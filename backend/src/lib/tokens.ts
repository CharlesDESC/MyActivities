import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';

export function generateAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
