import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError, errorHandler } from '../../middleware/errorHandler';

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('AppError', () => {
  it('stores statusCode, message and code', () => {
    const err = new AppError(404, 'Not found', 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without a code', () => {
    const err = new AppError(400, 'Bad request');
    expect(err.code).toBeUndefined();
  });
});

describe('errorHandler', () => {
  const req = {} as Request;
  const next = jest.fn() as unknown as NextFunction;

  it('responds with the AppError status and body', () => {
    const res = mockRes();
    errorHandler(new AppError(403, 'Forbidden', 'FORBIDDEN'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ code: 'FORBIDDEN', message: 'Forbidden' });
  });

  it('responds 400 with field details for ZodError', () => {
    const res = mockRes();
    let zodErr: z.ZodError;
    try { z.string().email().parse('not-an-email'); } catch (e) { zodErr = e as z.ZodError; }
    errorHandler(zodErr!, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]),
      }),
    );
  });

  it('responds 500 for generic errors', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('Boom'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    spy.mockRestore();
  });
});
