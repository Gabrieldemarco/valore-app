export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Datos inválidos', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acción no permitida') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export function asyncHandler(fn: (req: any, res: any, next: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function formatError(err: any): { status: number; body: any } {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (err instanceof AppError) {
    const body: any = { error: err.message, code: err.code };
    // Solo incluir details en desarrollo o si está explícitamente habilitado
    if (!isProduction || process.env.INCLUDE_ERROR_DETAILS === 'true') {
      body.details = err.details;
    }
    return {
      status: err.statusCode,
      body,
    };
  }
  return {
    status: err?.status || 500,
    body: { error: 'Error interno del servidor' },
  };
}
