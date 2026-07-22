import { Router, Request, Response, NextFunction } from 'express';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import {
  RegisterSchema, LoginSchema, RefreshSchema,
  ForgotPasswordSchema, ResetPasswordSchema, LogoutSchema,
} from '../schemas/auth';
import * as authService from '../services/auth.service';

const router = Router();

router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, pseudo, password, siret } = RegisterSchema.parse(req.body);
    const result = await authService.register(email, pseudo, password, siret);
    res.status(201).json({
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
      ...(process.env.NODE_ENV === 'development' && { _devToken: result.verificationToken }),
    });
  } catch (err) { next(err); }
});

router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pseudo, password, rememberMe } = LoginSchema.parse(req.body);
    const ip = req.ip ?? '0.0.0.0';
    const result = await authService.login(pseudo, password, ip, rememberMe);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = LogoutSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    res.json({ message: 'Si un compte correspond à cet email, vous recevrez un lien de réinitialisation.' });
  } catch (err) { next(err); }
});

router.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (err) { next(err); }
});

router.get('/verify-email/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email vérifié avec succès.' });
  } catch (err) { next(err); }
});

export default router;
