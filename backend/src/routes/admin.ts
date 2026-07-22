import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  SuspendUserSchema, DeleteUserAdminSchema, RejectActivitySchema,
  ListUsersQuerySchema, PromoteRoleSchema,
} from '../schemas/admin';
import { PaginationQuerySchema } from '../schemas/pagination';
import * as adminService from '../services/admin.service';

const router = Router();

router.get('/users', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = ListUsersQuerySchema.parse(req.query);
    const result = await adminService.listUsers(params);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/users/:userId/suspend', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason, suspendUntil } = SuspendUserSchema.parse(req.body);
    const user = await adminService.suspendUser(req.user!.sub, req.params.userId, reason, suspendUntil);
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/users/:userId', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = DeleteUserAdminSchema.parse(req.body);
    await adminService.deleteUserAdmin(req.user!.sub, req.params.userId, reason);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get('/activities/pending', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = PaginationQuerySchema.parse(req.query);
    const result = await adminService.listPendingActivities(page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/activities/:activityId/approve', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await adminService.approveActivity(req.user!.sub, req.params.activityId);
    res.json(activity);
  } catch (err) { next(err); }
});

router.patch('/activities/:activityId/reject', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = RejectActivitySchema.parse(req.body);
    const activity = await adminService.rejectActivity(req.user!.sub, req.params.activityId, reason);
    res.json(activity);
  } catch (err) { next(err); }
});

router.patch('/users/:userId/role', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = PromoteRoleSchema.parse(req.body);
    const user = await adminService.promoteUser(req.user!.sub, req.params.userId, role);
    res.json(user);
  } catch (err) { next(err); }
});

export default router;
