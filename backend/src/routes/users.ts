import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { UpdateUserSchema, DeleteAccountSchema } from '../schemas/user';
import { UserSearchQuerySchema } from '../schemas/friend';
import * as userService from '../services/user.service';

const router = Router();

// Recherche d'utilisateurs par pseudo (pour ajouter des amis)
router.get('/search', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = UserSearchQuerySchema.parse(req.query);
    const users = await userService.searchUsers(q, req.user!.sub);
    res.json({ data: users });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getMe(req.user!.sub);
    res.json(user);
  } catch (err) { next(err); }
});

router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateUserSchema.parse(req.body);
    const user = await userService.updateMe(req.user!.sub, data);
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = DeleteAccountSchema.parse(req.body);
    await userService.deleteMe(req.user!.sub, password);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
