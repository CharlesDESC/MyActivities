import rateLimit from 'express-rate-limit';
import { config } from '../config';

// Auth brute force: 5 attempts → 15 min lockout
export const authRateLimiter = rateLimit({
  windowMs: config.auth.rateLimitWindowMs,
  max: config.auth.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Trop de tentatives, veuillez réessayer plus tard.' },
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
