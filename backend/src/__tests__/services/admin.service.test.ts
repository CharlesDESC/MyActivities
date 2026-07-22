jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as adminService from '../../services/admin.service';

const mockQuery = pool.query as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ─── listUsers ────────────────────────────────────────────────────────────────

describe('admin.service — listUsers', () => {
  const fakeUser = {
    id: 'u-1', email: 'u@example.com', pseudo: 'User',
    role: 'member', status: 'active', review_count: 0, planning_count: 0,
  };

  it('returns paginated user list with no filters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeUser] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await adminService.listUsers({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('filters by status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await adminService.listUsers({ status: 'suspended', page: 1, limit: 20 });
    const queryCall = mockQuery.mock.calls[0][0] as string;
    expect(queryCall).toContain('status = $');
    expect(mockQuery.mock.calls[0][1]).toContain('suspended');
  });

  it('filters by role', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await adminService.listUsers({ role: 'organizer', page: 1, limit: 20 });
    const queryCall = mockQuery.mock.calls[0][0] as string;
    expect(queryCall).toContain('role = $');
    expect(mockQuery.mock.calls[0][1]).toContain('organizer');
  });

  it('filters by search term', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await adminService.listUsers({ search: 'john', page: 1, limit: 20 });
    const queryCall = mockQuery.mock.calls[0][0] as string;
    expect(queryCall).toContain('ILIKE');
    expect(mockQuery.mock.calls[0][1]).toContain('%john%');
  });

  it('calculates totalPages correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '45' }] });

    const result = await adminService.listUsers({ page: 2, limit: 20 });
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.page).toBe(2);
  });
});

// ─── suspendUser ──────────────────────────────────────────────────────────────

describe('admin.service — suspendUser', () => {
  it('suspends a user and logs the action', async () => {
    const suspended = {
      id: 'u-1', email: 'u@example.com', pseudo: 'User',
      role: 'member', status: 'suspended', suspendedUntil: new Date('2026-12-31'),
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })          // UPDATE users
      .mockResolvedValueOnce({ rows: [] })              // auditLog INSERT
      .mockResolvedValueOnce({ rows: [suspended] });    // fetchAdminUser

    const result = await adminService.suspendUser('admin-1', 'u-1', 'Spam', '2026-12-31T00:00:00Z');
    expect(result.status).toBe('suspended');
    expect(result.id).toBe('u-1');

    // audit log should be written
    const auditCall = mockQuery.mock.calls[1][0] as string;
    expect(auditCall).toContain('INSERT INTO admin_audit_log');
    expect(mockQuery.mock.calls[1][1]).toContain('SUSPEND_USER');
  });

  it('throws 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      adminService.suspendUser('admin-1', 'unknown', 'Spam', '2026-12-31T00:00:00Z'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─── deleteUserAdmin ──────────────────────────────────────────────────────────

describe('admin.service — deleteUserAdmin', () => {
  it('soft-deletes a user and revokes tokens', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })   // UPDATE users (soft delete)
      .mockResolvedValueOnce({ rows: [] })       // UPDATE refresh_tokens
      .mockResolvedValueOnce({ rows: [] });      // auditLog INSERT

    await expect(
      adminService.deleteUserAdmin('admin-1', 'u-1', 'Violation TOS'),
    ).resolves.toBeUndefined();

    const deleteCall = mockQuery.mock.calls[0][0] as string;
    expect(deleteCall).toContain("status = 'deleted'");

    const revokeCall = mockQuery.mock.calls[1][0] as string;
    expect(revokeCall).toContain('refresh_tokens');

    const auditCall = mockQuery.mock.calls[2][0] as string;
    expect(auditCall).toContain('INSERT INTO admin_audit_log');
    expect(mockQuery.mock.calls[2][1]).toContain('DELETE_USER');
  });

  it('throws 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    await expect(
      adminService.deleteUserAdmin('admin-1', 'unknown', 'reason'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─── promoteUser ──────────────────────────────────────────────────────────────

describe('admin.service — promoteUser', () => {
  it('promotes a user to organizer and logs the action', async () => {
    const promoted = {
      id: 'u-1', email: 'u@example.com', pseudo: 'User', role: 'organizer', status: 'active',
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })         // UPDATE users
      .mockResolvedValueOnce({ rows: [] })             // auditLog
      .mockResolvedValueOnce({ rows: [promoted] });    // fetchAdminUser

    const result = await adminService.promoteUser('admin-1', 'u-1', 'organizer');
    expect(result.role).toBe('organizer');

    const auditCall = mockQuery.mock.calls[1][0] as string;
    expect(auditCall).toContain('INSERT INTO admin_audit_log');
    expect(mockQuery.mock.calls[1][1]).toContain('PROMOTE_USER');
  });

  it('promotes a user to admin', async () => {
    const promoted = {
      id: 'u-1', email: 'u@example.com', pseudo: 'User', role: 'admin', status: 'active',
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [promoted] });

    const result = await adminService.promoteUser('admin-1', 'u-1', 'admin');
    expect(result.role).toBe('admin');
  });

  it('throws 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      adminService.promoteUser('admin-1', 'unknown', 'organizer'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─── listPendingActivities ────────────────────────────────────────────────────

describe('admin.service — listPendingActivities', () => {
  const fakeActivity = {
    id: 'act-1', name: 'Test', category: 'sport', description: 'Desc',
    address: '1 rue test', status: 'pending', created_at: new Date(),
    latitude: 48.85, longitude: 2.35,
    organizer: { id: 'org-1', pseudo: 'Org' },
  };

  it('returns paginated pending activities', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeActivity] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const result = await adminService.listPendingActivities(1, 20);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('pending');
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('returns empty list when no pending activities', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const result = await adminService.listPendingActivities(1, 20);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('calculates pagination correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '30' }] });

    const result = await adminService.listPendingActivities(2, 10);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.page).toBe(2);
  });
});

// ─── approveActivity ──────────────────────────────────────────────────────────

describe('admin.service — approveActivity', () => {
  it('publishes a pending activity and logs the action', async () => {
    const approved = {
      id: 'act-1', name: 'Test', status: 'published', updatedAt: new Date(),
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })        // UPDATE activities
      .mockResolvedValueOnce({ rows: [] })            // auditLog
      .mockResolvedValueOnce({ rows: [approved] });   // fetchActivityDetail

    const result = await adminService.approveActivity('admin-1', 'act-1');
    expect(result.status).toBe('published');

    const updateCall = mockQuery.mock.calls[0][0] as string;
    expect(updateCall).toContain("status = 'published'");
    expect(updateCall).toContain("status = 'pending'");

    const auditCall = mockQuery.mock.calls[1][0] as string;
    expect(auditCall).toContain('INSERT INTO admin_audit_log');
    expect(mockQuery.mock.calls[1][1]).toContain('APPROVE_ACTIVITY');
  });

  it('throws 404 if activity not found or not pending', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      adminService.approveActivity('admin-1', 'unknown'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

// ─── rejectActivity ───────────────────────────────────────────────────────────

describe('admin.service — rejectActivity', () => {
  it('rejects a pending activity with a reason and logs the action', async () => {
    const rejected = {
      id: 'act-1', name: 'Test', status: 'rejected',
      adminNote: 'Inappropriate content', updatedAt: new Date(),
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })        // UPDATE activities
      .mockResolvedValueOnce({ rows: [] })            // auditLog
      .mockResolvedValueOnce({ rows: [rejected] });   // fetchActivityDetail

    const result = await adminService.rejectActivity('admin-1', 'act-1', 'Inappropriate content');
    expect(result.status).toBe('rejected');
    expect(result.adminNote).toBe('Inappropriate content');

    const updateCall = mockQuery.mock.calls[0][0] as string;
    expect(updateCall).toContain("status = 'rejected'");
    expect(updateCall).toContain('admin_note');

    const auditCall = mockQuery.mock.calls[1][0] as string;
    expect(auditCall).toContain('INSERT INTO admin_audit_log');
    expect(mockQuery.mock.calls[1][1]).toContain('REJECT_ACTIVITY');
  });

  it('throws 404 if activity not found or not pending', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(
      adminService.rejectActivity('admin-1', 'unknown', 'reason'),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('stores the rejection reason as admin_note', async () => {
    const rejected = {
      id: 'act-1', name: 'Test', status: 'rejected',
      adminNote: 'Duplicate entry', updatedAt: new Date(),
    };
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [rejected] });

    const result = await adminService.rejectActivity('admin-1', 'act-1', 'Duplicate entry');
    expect(result.adminNote).toBe('Duplicate entry');
    // the reason should be passed as the first param ($1) to the UPDATE
    expect(mockQuery.mock.calls[0][1][0]).toBe('Duplicate entry');
  });
});
