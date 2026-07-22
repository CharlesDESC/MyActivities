import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  auth: {
    bcryptCost: 12,
    rateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '5', 10),
    rateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
  },

  appUrl: process.env.APP_URL ?? 'http://localhost:8081',

  // Stockage des photos d'activités. Fournisseur interchangeable (couche abstraite) :
  // 'local' (disque, MVP/dev) ou un futur adaptateur cloud (Cloudinary/S3) en prod.
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    uploadDir: process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads'),
    publicPath: '/uploads',
    maxFileSizeBytes: parseInt(process.env.UPLOAD_MAX_BYTES ?? String(5 * 1024 * 1024), 10), // 5 Mo
    maxPhotosPerActivity: parseInt(process.env.UPLOAD_MAX_PHOTOS ?? '10', 10),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  },

  // Fournisseur d'envoi d'emails : 'smtp' (relais SMTP) ou 'brevo-api' (API HTTP Brevo)
  emailProvider: process.env.EMAIL_PROVIDER ?? 'smtp',
  brevoApiKey: process.env.BREVO_API_KEY ?? '',

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'MyActivities <noreply@myactivities.app>',
  },
} as const;
