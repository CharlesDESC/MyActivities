jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as slotService from '../../services/slot.service';

const mockQuery = pool.query as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const mockSlot = {
  id: 'slot-1',
  activityId: 'act-1',
  startsAt: '2026-12-01T10:00:00.000Z',
  endsAt: '2026-12-01T12:00:00.000Z',
  capacity: 10,
  booked: 3,
  remaining: 7,
};

describe('slot.service — listSlots', () => {
  it('returns the slots with their availability', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockSlot] });

    const result = await slotService.listSlots('act-1');
    expect(result).toEqual([mockSlot]);
  });

  it('defaults to upcoming slots when no "from" is given', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await slotService.listSlots('act-1');

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('COALESCE($2::timestamptz, now())');
    expect(values).toEqual(['act-1', null]);
  });

  it('applies the "from" bound when given', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await slotService.listSlots('act-1', '2026-12-01T00:00:00.000Z');

    expect(mockQuery.mock.calls[0][1]).toEqual(['act-1', '2026-12-01T00:00:00.000Z']);
  });

  it('adds the "to" bound as an extra condition', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await slotService.listSlots('act-1', undefined, '2026-12-31T00:00:00.000Z');

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('s.starts_at <= $3');
    expect(values).toEqual(['act-1', null, '2026-12-31T00:00:00.000Z']);
  });
});

describe('slot.service — createSlots', () => {
  const slots = [{ startsAt: '2026-12-01T10:00:00.000Z', endsAt: null, capacity: 10 }];

  it('throws 404 when the activity does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(slotService.createSlots('unknown', 'org-1', 'organizer', slots)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws 403 when the organizer does not own the activity', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'someone-else' }] });

    await expect(slotService.createSlots('act-1', 'org-1', 'organizer', slots)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('lets an admin create slots on an activity they do not own', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'someone-else' }] })
      .mockResolvedValueOnce({ rows: [mockSlot] });

    const result = await slotService.createSlots('act-1', 'admin-1', 'admin', slots);
    expect(result).toEqual([mockSlot]);
  });

  it('inserts every slot for the owning organizer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [mockSlot] })
      .mockResolvedValueOnce({ rows: [{ ...mockSlot, id: 'slot-2' }] });

    const result = await slotService.createSlots('act-1', 'org-1', 'organizer', [
      { startsAt: '2026-12-01T10:00:00.000Z', endsAt: null, capacity: 10 },
      { startsAt: '2026-12-02T10:00:00.000Z', endsAt: '2026-12-02T12:00:00.000Z', capacity: 5 },
    ]);

    expect(result).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledTimes(3); // 1 vérification + 2 INSERT
  });

  it('normalises a missing endsAt to null', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [mockSlot] });

    await slotService.createSlots('act-1', 'org-1', 'organizer', [
      { startsAt: '2026-12-01T10:00:00.000Z', capacity: 10 },
    ]);

    expect(mockQuery.mock.calls[1][1]).toEqual(['act-1', '2026-12-01T10:00:00.000Z', null, 10]);
  });

  it('upserts on conflict so re-posting a slot updates its capacity', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'org-1' }] })
      .mockResolvedValueOnce({ rows: [mockSlot] });

    await slotService.createSlots('act-1', 'org-1', 'organizer', slots);

    expect(mockQuery.mock.calls[1][0]).toContain('ON CONFLICT (activity_id, starts_at) DO UPDATE');
  });
});
