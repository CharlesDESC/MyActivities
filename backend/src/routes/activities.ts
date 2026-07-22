import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ListActivitiesSchema, CreateActivitySchema, UpdateActivitySchema } from '../schemas/activity';
import { SlotsQuerySchema, CreateSlotsSchema } from '../schemas/slot';
import * as activityService from '../services/activity.service';
import * as slotService from '../services/slot.service';

const router = Router();

// ─── Créneaux ──────────────────────────────────────────────────────────────────
router.get('/:id/slots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = SlotsQuerySchema.parse(req.query);
    const slots = await slotService.listSlots(req.params.id, from, to);
    res.json({ data: slots });
  } catch (err) { next(err); }
});

router.post('/:id/slots', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slots } = CreateSlotsSchema.parse(req.body);
    const created = await slotService.createSlots(req.params.id, req.user!.sub, req.user!.role, slots);
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = ListActivitiesSchema.parse(req.query);
    const result = await activityService.listActivities(params);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await activityService.getActivity(req.params.id);
    res.json(activity);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateActivitySchema.parse(req.body);
    const activity = await activityService.createActivity(req.user!.sub, data);
    res.status(201).json(activity);
  } catch (err) { next(err); }
});

router.patch('/:id', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateActivitySchema.parse(req.body);
    const activity = await activityService.updateActivity(req.params.id, req.user!.sub, req.user!.role, data);
    res.json(activity);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('organizer', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await activityService.deleteActivity(req.params.id, req.user!.sub, req.user!.role);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
