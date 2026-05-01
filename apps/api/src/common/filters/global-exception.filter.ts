import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StructuredLogger } from '../logger/structured-logger';
import { monitoringNotifier } from '../monitoring/monitoring.notifier';

type ErrorRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  requestId?: string;
};

type ErrorResponse = {
  status(statusCode: number): {
    json(body: unknown): void;
  };
};

type PrismaLikeError = {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
  stack?: string;
  name?: string;
};

type NormalizedError = {
  statusCode: number;
  message: string | string[];
  error: string;
  details?: unknown;
};

const PRISMA_ERROR_MAP: Record<string, { statusCode: number; message: string; error: string }> = {
  P2000: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'One of the submitted values is too long.',
    error: 'Bad Request',
  },
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    message: 'A record with this value already exists.',
    error: 'Conflict',
  },
  P2003: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'This record is linked to another record and cannot be changed.',
    error: 'Bad Request',
  },
  P2014: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'This change would violate a required relationship.',
    error: 'Bad Request',
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Record not found.',
    error: 'Not Found',
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<ErrorResponse>();
    const request = context.getRequest<ErrorRequest>();
    const normalized = this.normalizeException(exception);
    const requestId = request.requestId;

    this.logger.error(
      {
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        statusCode: normalized.statusCode,
        error: normalized.error,
        message: normalized.message,
        details: normalized.details,
      },
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
    );

    if (normalized.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      void monitoringNotifier.notifyUnhandledError('api.unhandled_exception', exception, {
        requestId,
        method: request.method,
        path: request.originalUrl || request.url,
        statusCode: normalized.statusCode,
        error: normalized.error,
      });
    }

    response.status(normalized.statusCode).json({
      statusCode: normalized.statusCode,
      message: normalized.message,
      error: normalized.error,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      method: request.method,
      requestId,
    });
  }

  private normalizeException(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    const prismaError = this.normalizePrismaException(exception);
    if (prismaError) {
      return prismaError;
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception instanceof Error
            ? exception.message
            : 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private normalizeHttpException(exception: HttpException): NormalizedError {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        statusCode,
        message: response,
        error: exception.name,
      };
    }

    if (response && typeof response === 'object') {
      const body = response as Record<string, unknown>;
      const message = body.message;

      return {
        statusCode,
        message:
          typeof message === 'string' || Array.isArray(message)
            ? message
            : exception.message || 'Request failed',
        error: typeof body.error === 'string' ? body.error : exception.name,
        details: body.details,
      };
    }

    return {
      statusCode,
      message: exception.message || 'Request failed',
      error: exception.name,
    };
  }

  private normalizePrismaException(exception: unknown): NormalizedError | null {
    if (!exception || typeof exception !== 'object') return null;

    const error = exception as PrismaLikeError;
    if (!error.code || !error.code.startsWith('P')) return null;

    const mapped = PRISMA_ERROR_MAP[error.code] || {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed.',
      error: 'Database Error',
    };

    return {
      ...mapped,
      details: error.meta,
    };
  }
}
