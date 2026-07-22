import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import emailPageRoutes from './routes/emailPages';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import activityRoutes from './routes/activities';
import planningRoutes from './routes/planning';
import reviewRoutes from './routes/reviews';
import organizerRoutes from './routes/organizers';
import establishmentRoutes from './routes/establishments';
import adminRoutes from './routes/admin';
import messageRoutes from './routes/messages';
import friendRoutes from './routes/friends';

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(apiRateLimiter);

// Swagger UI
const swaggerDoc = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'swagger.yaml'), 'utf8'),
) as object;
app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Pages HTML des liens emails (vérification / reset) — hors préfixe /v1
app.use('/', emailPageRoutes);

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/activities', activityRoutes);
app.use('/v1/planning', planningRoutes);
app.use('/v1', reviewRoutes);
app.use('/v1/organizers', organizerRoutes);
app.use('/v1/establishments', establishmentRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/messages', messageRoutes);
app.use('/v1/friends', friendRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

app.use(errorHandler);

export default app;
