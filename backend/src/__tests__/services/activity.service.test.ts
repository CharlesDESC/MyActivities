jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

import { pool } from '../../db/pool';
import { getCachedActivities } from '../../lib/redis';
import * as activityService from '../../services/activity.service';
import type { ActivityCategory } from '../../types';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const mockActivity = {
  id: 'act-1',
  name: 'Escalade Paris',
  category: 'sport',
  address: '1 rue test',
  cover_image_url: null,
  avg_rating: 4.5,
  review_count: 10,
  price_min: 10,
  price_max: 30,
  latitude: 48.85,
  longitude: 2.35,
  distance: 1.2,
};

describe('activity.service — listActivities', () => {
  it('returns data and meta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [mockActivity] })          // data query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });       // count query

    const result = await activityService.listActivities({
      lat: 48.85, lng: 2.35, radius: 5,
      sort: 'distance', page: 1, limit: 10,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10, totalPages: 1 });
  });

  it('calculates totalPages correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '25' }] });

    const result = await activityService.listActivities({
      lat: 48.85, lng: 2.35, radius: 5,
      sort: 'distance', page: 1, limit: 10,
    });
    expect(result.meta.totalPages).toBe(3);
  });

  it('returns the cached result without querying the database', async () => {
    const cached = { data: [mockActivity], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
    (getCachedActivities as jest.Mock).mockResolvedValueOnce(cached);

    const result = await activityService.listActivities({
      lat: 48.85, lng: 2.35, radius: 5,
      sort: 'distance', page: 1, limit: 10,
    });
    expect(result).toBe(cached);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('applies all optional filters in the SQL query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await activityService.listActivities({
      lat: 48.85, lng: 2.35, radius: 5, sort: 'rating', page: 1, limit: 10,
      category: ['sport', 'culture'] as ActivityCategory[],
      priceMin: 5, priceMax: 50, minRating: 3, search: 'escalade',
    });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('a.category = ANY');
    expect(sql).toContain('a.price_min >=');
    expect(sql).toContain('a.price_max <=');
    expect(sql).toContain('a.avg_rating >=');
    expect(sql).toContain('plainto_tsquery');
    expect(mockQuery.mock.calls[0][1]).toEqual(
      expect.arrayContaining([['sport', 'culture'], 5, 50, 3, 'escalade']),
    );
  });
});

describe('activity.service — getActivity', () => {
  it('throws 404 without incrementing views if activity not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });   // SELECT detail

    await expect(activityService.getActivity('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    // seul le SELECT a été exécuté — pas d'UPDATE views
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns the activity with organizer and photos, then increments views', async () => {
    const fullActivity = { ...mockActivity, description: 'Desc', organizer: { id: 'org-1', pseudo: 'Org' }, photos: [] };
    mockQuery
      .mockResolvedValueOnce({ rows: [fullActivity] })   // SELECT detail
      .mockResolvedValueOnce({ rows: [] });               // UPDATE views

    const result = await activityService.getActivity('act-1');
    expect(result.organizer).toMatchObject({ id: 'org-1' });
    const viewsCall = mockQuery.mock.calls[1][0] as string;
    expect(viewsCall).toContain('views + 1');
  });
});

describe('activity.service — createActivity', () => {
  const data = {
    name: 'Escalade', category: 'sport' as ActivityCategory, description: 'Desc',
    priceMin: 10, priceMax: 30,
  };
  // Établissement possédé par 'org-1' — adresse/position héritées par l'activité.
  const ownedEstablishment = { id: 'est-1', organizerId: 'org-1', address: '1 rue test', latitude: 48.85, longitude: 2.35 };

  it('creates activity and returns the full detail', async () => {
    const detail = { ...mockActivity, id: 'act-new', name: data.name, status: 'published', organizer: { id: 'org-1', pseudo: 'Org' }, photos: [] };
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })                    // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'act-new' }] })   // INSERT activity RETURNING id
        .mockResolvedValueOnce({ rows: [] }),                   // COMMIT
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    mockQuery
      .mockResolvedValueOnce({ rows: [ownedEstablishment] })    // resolveOrganizerEstablishment
      .mockResolvedValueOnce({ rows: [detail] });               // fetchActivityDetail

    const result = await activityService.createActivity('org-1', data);
    expect(result.name).toBe('Escalade');
    expect(result.status).toBe('published');
    expect(result.organizer).toMatchObject({ id: 'org-1' });
    // L'adresse/position insérées proviennent bien de l'établissement.
    const insertParams = mockClient.query.mock.calls[1][1] as unknown[];
    expect(insertParams).toEqual(expect.arrayContaining(['1 rue test', 2.35, 48.85, 'est-1']));
    expect(insertParams).toContain('published');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('requires the account establishment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(activityService.createActivity('org-1', data)).rejects.toMatchObject({ statusCode: 409, code: 'ESTABLISHMENT_REQUIRED' });
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('inserts photos when provided', async () => {
    const detail = { ...mockActivity, id: 'act-new', photos: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'] };
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })                    // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'act-new' }] })   // INSERT activity
        .mockResolvedValueOnce({ rows: [] })                    // INSERT photos
        .mockResolvedValueOnce({ rows: [] }),                   // COMMIT
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    mockQuery
      .mockResolvedValueOnce({ rows: [ownedEstablishment] })    // resolveOrganizerEstablishment
      .mockResolvedValueOnce({ rows: [detail] });               // fetchActivityDetail

    const result = await activityService.createActivity('org-1', {
      ...data, photos: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'],
    });

    const photosCall = mockClient.query.mock.calls[2][0] as string;
    expect(photosCall).toContain('INSERT INTO activity_photos');
    expect(mockClient.query.mock.calls[2][1]).toEqual(
      ['act-new', 'https://cdn.test/1.jpg', 0, 'act-new', 'https://cdn.test/2.jpg', 1],
    );
    expect(result.photos).toHaveLength(2);
  });

  it('creates the initial event slot in the activity transaction', async () => {
    const detail = { ...mockActivity, id: 'act-new', photos: [] };
    const initialSlot = { startsAt: '2099-08-15T08:30:00.000Z', capacity: 20 };
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'act-new' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    mockQuery
      .mockResolvedValueOnce({ rows: [ownedEstablishment] })
      .mockResolvedValueOnce({ rows: [detail] });

    await activityService.createActivity('org-1', { ...data, initialSlot });

    expect(mockClient.query.mock.calls[2][0]).toContain('INSERT INTO activity_slots');
    expect(mockClient.query.mock.calls[2][1]).toEqual(['act-new', initialSlot.startsAt, 20]);
    expect(mockClient.query.mock.calls[3][0]).toBe('COMMIT');
  });

  it('rolls back and rethrows on error', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })              // BEGIN
        .mockRejectedValueOnce(new Error('DB error')),    // INSERT fails
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);
    mockQuery.mockResolvedValueOnce({ rows: [ownedEstablishment] });  // resolveOrganizerEstablishment

    await expect(activityService.createActivity('org-1', data)).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

describe('activity.service — updateActivity', () => {
  it('throws 404 if activity does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      activityService.updateActivity('act-1', 'user-1', 'member', { name: 'New' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws 403 if non-owner tries to update', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'other-user', status: 'published' }] });
    await expect(
      activityService.updateActivity('act-1', 'user-1', 'member', { name: 'New' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('admin can update any activity', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'other-user', status: 'published' }] })
      .mockResolvedValueOnce({ rows: [] })   // UPDATE
      .mockResolvedValueOnce({ rows: [{ ...mockActivity, name: 'New', status: 'published' }] }); // fetchActivityDetail

    const result = await activityService.updateActivity('act-1', 'admin-1', 'admin', { name: 'New' });
    expect(result.name).toBe('New');
  });

  it('updates optional fields (horaires, accessibilité, site web)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'user-1', status: 'published' }] })  // existing
      .mockResolvedValueOnce({ rows: [] })   // UPDATE
      .mockResolvedValueOnce({ rows: [mockActivity] }); // fetchActivityDetail

    await activityService.updateActivity('act-1', 'user-1', 'organizer', {
      openingHours: { monday: '09:00-18:00' },
      accessibility: { pmr: true, stroller: false },
      websiteUrl: 'https://exemple.fr',
      priceMin: 5, priceMax: 10,
    });

    const sql = mockQuery.mock.calls[1][0] as string;
    expect(sql).toContain('opening_hours');
    expect(sql).toContain('accessibility_pmr');
    expect(sql).toContain('website_url');
    expect(sql).toContain('price_min');
    expect(sql).toContain('price_max');
  });

  it('keeps a published activity published while moderation is disabled', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'user-1', status: 'published' }] })
      .mockResolvedValueOnce({ rows: [] })   // UPDATE
      .mockResolvedValueOnce({ rows: [{ ...mockActivity, name: 'New Name', status: 'published' }] }); // fetchActivityDetail

    const result = await activityService.updateActivity('act-1', 'user-1', 'organizer', { name: 'New Name' });
    const updateCall = mockQuery.mock.calls[1][0] as string;
    expect(updateCall).not.toContain("status = 'pending'");
    expect(result.status).toBe('published');
  });
});

describe('activity.service — deleteActivity', () => {
  it('throws 404 if activity not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(activityService.deleteActivity('act-1', 'user-1', 'member')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 if non-owner tries to delete', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'other' }] });
    await expect(activityService.deleteActivity('act-1', 'user-1', 'member')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deletes the activity for the owner', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(activityService.deleteActivity('act-1', 'user-1', 'organizer')).resolves.toBeUndefined();
  });

  it('allows admin to delete any activity', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ organizer_id: 'other' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(activityService.deleteActivity('act-1', 'admin-1', 'admin')).resolves.toBeUndefined();
  });
});
