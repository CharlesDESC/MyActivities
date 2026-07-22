import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';
import { AppError } from './errorHandler';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Token JWT manquant ou invalide.', 'UNAUTHORIZED'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Token JWT expiré ou invalide.', 'UNAUTHORIZED'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'Permissions insuffisantes.', 'FORBIDDEN'));
    }
    next();
  };
}
