import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { OrganizerActivitiesQuerySchema } from '../schemas/activity';
import * as activityService from '../services/activity.service';

const router = Router();

router.get('/me/activities', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, limit } = OrganizerActivitiesQuerySchema.parse(req.query);
    const result = await activityService.listOrganizerActivities(req.user!.sub, status, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/me/stats', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await activityService.getOrganizerStats(req.user!.sub);
    res.json(stats);
  } catch (err) { next(err); }
});

// Réservations d'une activité (créneaux + participants), réservé à son organisateur.
router.get('/me/activities/:activityId/reservations', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await activityService.getActivityReservations(req.params.activityId, req.user!.sub, req.user!.role);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
