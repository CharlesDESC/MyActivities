import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

type JsonParseError = SyntaxError & {
  status?: number;
  type?: string;
};

function isJsonParseError(err: Error): err is JsonParseError {
  const parseError = err as JsonParseError;
  return err instanceof SyntaxError
    && parseError.status === 400
    && parseError.type === 'entity.parse.failed';
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Données invalides.',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (isJsonParseError(err)) {
    res.status(400).json({
      code: 'INVALID_JSON',
      message: 'Corps JSON invalide.',
    });
    return;
  }

  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
