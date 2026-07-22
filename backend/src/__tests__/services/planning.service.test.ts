jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as planningService from '../../services/planning.service';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const mockEntry = {
  id: 'plan-1',
  scheduledAt: new Date().toISOString(),
  reminderOffset: 30,
  createdAt: new Date(),
  activity: { id: 'act-1', name: 'Escalade', category: 'sport' },
};

describe('planning.service — getPlanning', () => {
  it('returns planning entries with meta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockEntry] })           // data
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });     // count

    const result = await planningService.getPlanning('user-1', 1, 10);
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('returns empty list when no entries', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const result = await planningService.getPlanning('user-1', 1, 10);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('applies date filters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await planningService.getPlanning('user-1', 1, 10, '2026-01-01', '2026-12-31');

    const dataCall = mockQuery.mock.calls[0][0] as string;
    expect(dataCall).toContain('scheduled_at >=');
    expect(dataCall).toContain('scheduled_at <=');
  });
});

describe('planning.service — addToPlanning', () => {
  it('throws 404 if activity not found or not published', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      planningService.addToPlanning('user-1', 'act-nonexistent', '2026-07-01T10:00:00Z'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('inserts the planning entry and returns it with its activity', async () => {
    const newEntry = { ...mockEntry, id: 'plan-new', reminderOffset: null };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] })   // activity check
      .mockResolvedValueOnce({ rows: [{ id: 'plan-new' }] })              // INSERT RETURNING id
      .mockResolvedValueOnce({ rows: [newEntry] });                       // SELECT entry + activity

    const result = await planningService.addToPlanning('user-1', 'act-1', '2026-07-01T10:00:00Z', null);
    expect(result.id).toBe('plan-new');
    expect(result.activity).toMatchObject({ id: 'act-1' });
  });

  it('includes reminder offset when provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'plan-2' }] })
      .mockResolvedValueOnce({ rows: [{ ...mockEntry, id: 'plan-2', reminderOffset: 60 }] });

    const result = await planningService.addToPlanning('user-1', 'act-1', '2026-07-01T10:00:00Z', 60);
    expect(result.reminderOffset).toBe(60);
  });
});

describe('planning.service — addToPlanning avec créneau (bookSlot)', () => {
  const FUTURE = '2099-01-01T10:00:00.000Z';
  const PAST = '2020-01-01T10:00:00.000Z';

  /**
   * Client de transaction mocké. `slot` / `booked` / `inserted` alimentent
   * successivement les SELECT ... FOR UPDATE, le COUNT et l'INSERT ;
   * BEGIN / COMMIT / ROLLBACK retombent sur une réponse vide.
   */
  function mockTransaction(steps: { slot?: any; booked?: string; inserted?: string }) {
    const query = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve(
          steps.slot
            ? { rowCount: 1, rows: [steps.slot] }
            : { rowCount: 0, rows: [] },
        );
      }
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: steps.booked ?? '0' }] });
      }
      if (sql.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: steps.inserted ?? 'plan-slot' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    const client = { query, release: jest.fn() };
    mockConnect.mockResolvedValue(client);
    return client;
  }

  const publishedActivity = () =>
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'act-1' }] });

  it('books the slot and commits', async () => {
    publishedActivity();
    const client = mockTransaction({
      slot: { starts_at: FUTURE, capacity: 10, activity_id: 'act-1' },
      booked: '3',
      inserted: 'plan-slot',
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockEntry, id: 'plan-slot' }] });

    const result = await planningService.addToPlanning('user-1', 'act-1', undefined, 30, 'slot-1');

    expect(result.id).toBe('plan-slot');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('uses the slot start time as the scheduled date', async () => {
    publishedActivity();
    const client = mockTransaction({
      slot: { starts_at: FUTURE, capacity: 10, activity_id: 'act-1' },
    });
    mockQuery.mockResolvedValueOnce({ rows: [mockEntry] });

    await planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1');

    const insertCall = client.query.mock.calls.find(([sql]: [string]) => sql.includes('INSERT'));
    expect(insertCall[1]).toEqual(['user-1', 'act-1', FUTURE, null, 'slot-1']);
  });

  it('throws 404 when the slot does not exist', async () => {
    publishedActivity();
    const client = mockTransaction({});

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-unknown'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'SLOT_NOT_FOUND' });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('throws 400 when the slot belongs to another activity', async () => {
    publishedActivity();
    mockTransaction({ slot: { starts_at: FUTURE, capacity: 10, activity_id: 'act-other' } });

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'SLOT_MISMATCH' });
  });

  it('throws 400 when the slot is already in the past', async () => {
    publishedActivity();
    mockTransaction({ slot: { starts_at: PAST, capacity: 10, activity_id: 'act-1' } });

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1'),
    ).rejects.toMatchObject({ statusCode: 400, code: 'SLOT_IN_PAST' });
  });

  it('throws 409 when the slot is full', async () => {
    publishedActivity();
    mockTransaction({
      slot: { starts_at: FUTURE, capacity: 5, activity_id: 'act-1' },
      booked: '5',
    });

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SLOT_FULL' });
  });

  it('locks the slot row so two concurrent bookings cannot exceed capacity', async () => {
    publishedActivity();
    const client = mockTransaction({ slot: { starts_at: FUTURE, capacity: 10, activity_id: 'act-1' } });
    mockQuery.mockResolvedValueOnce({ rows: [mockEntry] });

    await planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1');

    const lockCall = client.query.mock.calls.find(([sql]: [string]) => sql.includes('activity_slots'));
    expect(lockCall[0]).toContain('FOR UPDATE');
  });

  it('maps the unique violation to 409 ALREADY_BOOKED', async () => {
    publishedActivity();
    const client = { query: jest.fn(), release: jest.fn() };
    client.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) {
        return Promise.resolve({ rowCount: 1, rows: [{ starts_at: FUTURE, capacity: 10, activity_id: 'act-1' }] });
      }
      if (sql.includes('COUNT(*)')) return Promise.resolve({ rows: [{ count: '0' }] });
      if (sql.includes('INSERT')) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
      return Promise.resolve({ rows: [] });
    });
    mockConnect.mockResolvedValue(client);

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1'),
    ).rejects.toMatchObject({ statusCode: 409, code: 'ALREADY_BOOKED' });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rolls back and rethrows unexpected database errors', async () => {
    publishedActivity();
    const client = { query: jest.fn(), release: jest.fn() };
    client.query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE')) return Promise.reject(new Error('connexion perdue'));
      return Promise.resolve({ rows: [] });
    });
    mockConnect.mockResolvedValue(client);

    await expect(
      planningService.addToPlanning('user-1', 'act-1', undefined, null, 'slot-1'),
    ).rejects.toThrow('connexion perdue');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('never opens a transaction when the activity is not published', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      planningService.addToPlanning('user-1', 'act-unknown', undefined, null, 'slot-1'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(mockConnect).not.toHaveBeenCalled();
  });
});

describe('planning.service — removePlanning', () => {
  it('throws 404 if planning entry not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(planningService.removePlanning('user-1', 'plan-nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if entry belongs to another user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'other-user' }] });
    await expect(planningService.removePlanning('user-1', 'plan-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deletes the entry for the owner', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(planningService.removePlanning('user-1', 'plan-1')).resolves.toBeUndefined();
  });
});
