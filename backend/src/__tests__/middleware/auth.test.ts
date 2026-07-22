import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { generateAccessToken } from '../../lib/tokens';

function makeReq(authHeader?: string): Request {
  return { headers: authHeader ? { authorization: authHeader } : {} } as unknown as Request;
}

const res = {} as Response;
const next = jest.fn() as unknown as NextFunction;

beforeEach(() => jest.clearAllMocks());

describe('authenticate', () => {
  it('rejects with 401 when no Authorization header', () => {
    authenticate(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects with 401 when header does not start with "Bearer "', () => {
    authenticate(makeReq('Basic dXNlcjpwYXNz'), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects with 401 for a malformed token', () => {
    authenticate(makeReq('Bearer not.a.valid.jwt'), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('sets req.user and calls next() for a valid token', () => {
    const token = generateAccessToken('user-42', 'organizer');
    const req = makeReq(`Bearer ${token}`);
    authenticate(req, res, next);
    expect((req as any).user).toMatchObject({ sub: 'user-42', role: 'organizer' });
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize', () => {
  it('rejects with 403 when req.user is absent', () => {
    authorize('admin')(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('rejects with 403 when user role does not match', () => {
    const req = { user: { sub: 'u1', role: 'member' } } as unknown as Request;
    authorize('admin')(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('calls next() when role matches', () => {
    const req = { user: { sub: 'u1', role: 'admin' } } as unknown as Request;
    authorize('admin')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when user has one of the allowed roles', () => {
    const req = { user: { sub: 'u1', role: 'organizer' } } as unknown as Request;
    authorize('admin', 'organizer')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
