jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../lib/password', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

import { pool } from '../../db/pool';
import { verifyPassword } from '../../lib/password';
import * as userService from '../../services/user.service';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const mockUserRow = {
  id: 'user-1',
  email: 'test@example.com',
  pseudo: 'TestUser',
  role: 'member',
  status: 'active',
  avatarUrl: null,
  emailVerified: true,
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('user.service — getMe', () => {
  it('throws 404 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(userService.getMe('user-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the user row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockUserRow] });
    const result = await userService.getMe('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@example.com');
  });
});

describe('user.service — updateMe', () => {
  it('throws 400 if no fields provided', async () => {
    await expect(userService.updateMe('user-1', {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'NO_FIELDS',
    });
  });

  it('throws 404 if user not found during update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(userService.updateMe('user-1', { pseudo: 'New' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('updates pseudo and returns updated user', async () => {
    const updated = { ...mockUserRow, pseudo: 'NewPseudo' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const result = await userService.updateMe('user-1', { pseudo: 'NewPseudo' });
    expect(result.pseudo).toBe('NewPseudo');
  });

  it('throws 409 if the new pseudo is already taken', async () => {
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(userService.updateMe('user-1', { pseudo: 'Taken' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'PSEUDO_ALREADY_EXISTS',
    });
  });

  it('updates avatarUrl including null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockUserRow, avatarUrl: null }] });
    const result = await userService.updateMe('user-1', { avatarUrl: null });
    expect(result.avatarUrl).toBeNull();
  });
});

describe('user.service — deleteMe', () => {
  it('throws 404 if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(userService.deleteMe('user-1', 'pass')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 401 if password is incorrect', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$hash' }] });
    (verifyPassword as jest.Mock).mockResolvedValue(false);
    await expect(userService.deleteMe('user-1', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_PASSWORD',
    });
  });

  it('anonymises user and revokes sessions in a transaction', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$hash' }] });
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);

    await userService.deleteMe('user-1', 'correct');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('status = \'deleted\''),
      expect.any(Array),
    );
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and rethrows if the transaction fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ password_hash: '$hash' }] });
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    const mockClient = {
      query: jest.fn(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('UPDATE users')) throw new Error('DB down');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);

    await expect(userService.deleteMe('user-1', 'correct')).rejects.toThrow('DB down');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
