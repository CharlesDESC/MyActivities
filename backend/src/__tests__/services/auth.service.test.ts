jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../lib/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  verifyPassword: jest.fn(),
}));
jest.mock('../../lib/tokens', () => ({
  generateAccessToken: jest.fn().mockReturnValue('access.token.mock'),
  generateOpaqueToken: jest.fn().mockReturnValue('rawtoken64chars'),
  hashToken: jest.fn().mockReturnValue('sha256hashedtoken'),
}));

import { pool } from '../../db/pool';
import * as authService from '../../services/auth.service';
import { verifyPassword } from '../../lib/password';

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  pseudo: 'TestUser',
  role: 'member' as const,
  status: 'active',
  avatarUrl: null,
  emailVerified: true,
  password_hash: '$2b$12$hashedpassword',
  suspended_until: null,
};

beforeEach(() => jest.clearAllMocks());

describe('auth.service — register', () => {
  it('throws 409 if email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'test@example.com', pseudo: 'Autre' }] });
    await expect(authService.register('test@example.com', 'Test', 'Pass1word!')).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('throws 409 if pseudo already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'autre@example.com', pseudo: 'Test' }] });
    await expect(authService.register('test@example.com', 'Test', 'Pass1word!')).rejects.toMatchObject({
      statusCode: 409,
      code: 'PSEUDO_ALREADY_EXISTS',
    });
  });

  it('creates a user and returns verificationToken', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })             // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 'new-user', email: 'test@example.com', pseudo: 'Test', role: 'member', status: 'active', avatar_url: null, email_verified: false, created_at: new Date() }] }) // INSERT user
      .mockResolvedValueOnce({ rows: [] });                          // INSERT verification token

    const result = await authService.register('test@example.com', 'Test', 'Pass1word!');
    expect(result.user.email).toBe('test@example.com');
    expect(result.verificationToken).toBe('rawtoken64chars');
    // Sans SIRET → rôle member
    const insertParams = mockQuery.mock.calls[1][1];
    expect(insertParams).toEqual(expect.arrayContaining(['member', null]));
  });

  it('creates an organizer account when a SIRET is provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 'orga-1', email: 'orga@example.com', pseudo: 'Orga', role: 'organizer', status: 'active', siret: '73282932000074', avatar_url: null, email_verified: false, created_at: new Date() }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await authService.register('orga@example.com', 'Orga', 'Pass1word!', '73282932000074');
    expect(result.user.role).toBe('organizer');
    const insertParams = mockQuery.mock.calls[1][1];
    expect(insertParams).toEqual(expect.arrayContaining(['organizer', '73282932000074']));
  });
});

describe('auth.service — login', () => {
  it('throws 429 if brute force limit exceeded', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1000' }] }); // count >= AUTH_RATE_LIMIT_MAX
    await expect(authService.login('TestUser', 'pass', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('throws 401 if user not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // brute force OK
      .mockResolvedValue({ rows: [] });                    // no user found + subsequent calls
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(authService.login('nobody', 'pass', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws 401 if password is wrong', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })          // brute force OK
      .mockResolvedValueOnce({ rows: [] })                          // fire-and-forget INSERT
      .mockResolvedValueOnce({ rows: [mockUser] });                 // user found
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(authService.login(mockUser.pseudo, 'wrong', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws 403 if account is suspended', async () => {
    const suspendedUser = { ...mockUser, status: 'suspended', suspended_until: new Date(Date.now() + 3600_000).toISOString() };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [suspendedUser] });
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    await expect(authService.login(suspendedUser.pseudo, 'Pass1word!', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
  });

  it('throws 403 if email is not verified', async () => {
    const unverifiedUser = { ...mockUser, emailVerified: false };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [unverifiedUser] });
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    await expect(authService.login(unverifiedUser.pseudo, 'Pass1word!', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('returns tokens on successful login', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })  // brute force
      .mockResolvedValueOnce({ rows: [] })                  // fire-and-forget INSERT
      .mockResolvedValueOnce({ rows: [mockUser] })          // SELECT user
      .mockResolvedValue({ rows: [] });                     // markAttemptSuccess + INSERT refresh
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    const result = await authService.login(mockUser.pseudo, 'Pass1word!', '127.0.0.1');
    expect(result.accessToken).toBe('access.token.mock');
    expect(result.refreshToken).toBe('rawtoken64chars');
    expect(result.expiresIn).toBe(900);
    expect(result.user).not.toHaveProperty('password_hash');
  });
});

describe('auth.service — refresh', () => {
  it('throws 401 if refresh token not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(authService.refresh('invalidtoken')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('throws 401 if refresh token is expired', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'rt-1', user_id: 'u-1', role: 'member', expires_at: new Date(Date.now() - 1000).toISOString() }],
    });
    await expect(authService.refresh('expiredtoken')).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_EXPIRED',
    });
  });

  it('rotates and returns new tokens on valid refresh', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'rt-1', user_id: 'u-1', role: 'member', expires_at: new Date(Date.now() + 3600_000).toISOString() }],
      })
      .mockResolvedValue({ rows: [] });

    const result = await authService.refresh('validtoken');
    expect(result.accessToken).toBe('access.token.mock');
    expect(result.refreshToken).toBe('rawtoken64chars');
  });
});

describe('auth.service — logout', () => {
  it('revokes the refresh token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    await expect(authService.logout('sometoken')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE refresh_tokens'),
      expect.arrayContaining(['sha256hashedtoken']),
    );
  });
});

describe('auth.service — forgotPassword', () => {
  it('resolves silently if user does not exist (anti-enumeration)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(authService.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('creates a reset token if user exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'u-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    await authService.forgotPassword('user@example.com');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

describe('auth.service — resetPassword', () => {
  it('throws 400 if token is invalid or expired', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(authService.resetPassword('badtoken', 'NewPass1!')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_RESET_TOKEN',
    });
  });

  it('updates password and revokes sessions in a transaction', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'prt-1', user_id: 'u-1' }] });
    const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);

    await authService.resetPassword('validtoken', 'NewPass1!');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and rethrows if the transaction fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'prt-1', user_id: 'u-1' }] });
    const mockClient = {
      query: jest.fn(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('UPDATE users')) throw new Error('DB down');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);

    await expect(authService.resetPassword('validtoken', 'NewPass1!')).rejects.toThrow('DB down');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

describe('auth.service — verifyEmail', () => {
  it('throws 400 if verification token is invalid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(authService.verifyEmail('badtoken')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_VERIFICATION_TOKEN',
    });
  });

  it('marks email as verified in a transaction', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'evt-1', user_id: 'u-1' }] });
    const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
    mockConnect.mockResolvedValue(mockClient);

    await authService.verifyEmail('validtoken');
    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and rethrows if the transaction fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'evt-1', user_id: 'u-1' }] });
    const mockClient = {
      query: jest.fn(async (sql: string) => {
        if (typeof sql === 'string' && sql.includes('UPDATE users')) throw new Error('DB down');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    mockConnect.mockResolvedValue(mockClient);

    await expect(authService.verifyEmail('validtoken')).rejects.toThrow('DB down');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });
});
