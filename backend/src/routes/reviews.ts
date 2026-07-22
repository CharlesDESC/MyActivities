import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { CreateReviewSchema, UpdateReviewSchema, ReviewQuerySchema } from '../schemas/review';
import * as reviewService from '../services/review.service';

const router = Router();

// Ratings are scoped to an activity — 1 per user per activity (BF-029)
router.get('/activities/:activityId/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sort, page, limit } = ReviewQuerySchema.parse(req.query);
    const result = await reviewService.listReviews(req.params.activityId, page, limit, sort);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/activities/:activityId/reviews', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating } = CreateReviewSchema.parse(req.body);
    const review = await reviewService.createReview(req.user!.sub, req.params.activityId, rating);
    res.status(201).json(review);
  } catch (err) { next(err); }
});

router.patch('/activities/:activityId/reviews/:reviewId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating } = UpdateReviewSchema.parse(req.body);
    const review = await reviewService.updateReview(req.user!.sub, req.params.reviewId, req.params.activityId, rating);
    res.json(review);
  } catch (err) { next(err); }
});

router.delete('/activities/:activityId/reviews/:reviewId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await reviewService.deleteReview(req.user!.sub, req.params.reviewId, req.params.activityId, req.user!.role);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
