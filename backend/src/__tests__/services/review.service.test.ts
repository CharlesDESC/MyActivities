jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as reviewService from '../../services/review.service';

const mockQuery = pool.query as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const mockReviewRow = {
  id: 'rev-1',
  rating: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: { id: 'user-1', pseudo: 'TestUser', avatarUrl: null },
};

describe('review.service — listReviews', () => {
  it('throws 404 if activity not found or not published', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(reviewService.listReviews('nonexistent', 1, 10, 'date_desc')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns reviews with pagination meta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ avg_rating: 4.2, review_count: 3 }] }) // activity check
      .mockResolvedValueOnce({ rows: [mockReviewRow] })                                       // data
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });                                    // count

    const result = await reviewService.listReviews('act-1', 1, 10, 'date_desc');
    expect(result.data).toHaveLength(1);
    expect(result.avgRating).toBe(4.2);
    expect(result.meta.total).toBe(1);
  });
});

describe('review.service — createReview', () => {
  it('throws 404 if activity not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(reviewService.createReview('user-1', 'act-1', 5)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if the activity is not in the user planning', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] }) // activity found
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });                // planning check

    await expect(reviewService.createReview('user-1', 'act-1', 5)).rejects.toMatchObject({
      statusCode: 403,
      code: 'PLANNING_REQUIRED',
    });
  });

  it('throws 409 if user already reviewed this activity', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] }) // activity found
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })               // planning check
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));

    await expect(reviewService.createReview('user-1', 'act-1', 5)).rejects.toMatchObject({
      statusCode: 409,
      code: 'REVIEW_ALREADY_EXISTS',
    });
  });

  it('creates review, recalculates rating and returns it with its author', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] })            // activity check
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })                          // planning check
      .mockResolvedValueOnce({ rows: [{ id: 'rev-new' }] })                        // INSERT RETURNING id
      .mockResolvedValueOnce({ rows: [] })                                         // recalcRating UPDATE
      .mockResolvedValueOnce({ rows: [{ ...mockReviewRow, id: 'rev-new', rating: 5 }] }); // fetchReview

    const result = await reviewService.createReview('user-1', 'act-1', 5);
    expect(result.rating).toBe(5);
    expect(result.author).toMatchObject({ id: 'user-1' });
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });
});

describe('review.service — updateReview', () => {
  it('throws 404 if review not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(reviewService.updateReview('user-1', 'rev-1', 'act-1', 3)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if user is not the review author', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'other-user', activity_id: 'act-1' }] });
    await expect(reviewService.updateReview('user-1', 'rev-1', 'act-1', 3)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('updates rating and recalculates activity rating', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'user-1', activity_id: 'act-1' }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] })                                                          // UPDATE
      .mockResolvedValueOnce({ rows: [] })                                                          // recalcRating
      .mockResolvedValueOnce({ rows: [{ ...mockReviewRow, rating: 3 }] });                          // fetchReview

    const result = await reviewService.updateReview('user-1', 'rev-1', 'act-1', 3);
    expect(result.rating).toBe(3);
  });
});

describe('review.service — deleteReview', () => {
  it('throws 404 if review not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(reviewService.deleteReview('user-1', 'rev-1', 'act-1', 'member')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if non-author non-admin tries to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'other', activity_id: 'act-1' }] });
    await expect(reviewService.deleteReview('user-1', 'rev-1', 'act-1', 'member')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deletes own review', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'user-1', activity_id: 'act-1' }] })
      .mockResolvedValueOnce({ rows: [] })   // DELETE
      .mockResolvedValueOnce({ rows: [] });  // recalcRating
    await expect(reviewService.deleteReview('user-1', 'rev-1', 'act-1', 'member')).resolves.toBeUndefined();
  });

  it('allows admin to delete any review', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'other', activity_id: 'act-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(reviewService.deleteReview('admin-1', 'rev-1', 'act-1', 'admin')).resolves.toBeUndefined();
  });
});
