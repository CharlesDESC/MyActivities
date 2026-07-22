import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AddToPlanningSchema, PlanningQuerySchema } from '../schemas/planning';
import * as planningService from '../services/planning.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, page, limit } = PlanningQuerySchema.parse(req.query);
    const result = await planningService.getPlanning(req.user!.sub, page, limit, from, to);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activityId, scheduledAt, reminderOffset, slotId } = AddToPlanningSchema.parse(req.body);
    const entry = await planningService.addToPlanning(req.user!.sub, activityId, scheduledAt, reminderOffset, slotId);
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

router.delete('/:planningId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await planningService.removePlanning(req.user!.sub, req.params.planningId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
