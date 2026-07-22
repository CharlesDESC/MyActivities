import type { UserRole, SafeUser } from './user';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: 900;
}

export interface LoginResult extends TokenPair {
  user: SafeUser;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  role: UserRole;
  expires_at: string;
}

// ─── Express global augmentation ───────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
