import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import type { ApiErrorResponse, ApiFieldError } from '@cca/shared-types';
import { ErrorCode } from '@cca/shared-types';

interface NormalizedError {
  code: string;
  message: string;
  statusCode: number;
  details?: ApiFieldError[];
}

const STATUS_TO_FALLBACK_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

/**
 * Catches every exception thrown anywhere in the app (HttpExceptions,
 * AppExceptions, validation errors, and truly unexpected throws) and
 * normalizes them into the shared `ApiErrorResponse` envelope so the
 * frontend / mobile app / any future consumer only ever has to handle
 * one error shape.
 *
 * 500-class errors are logged with full detail server-side via pino but
 * never leak internal messages/stack traces to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);
    const requestId = (request as unknown as { id?: string }).id;

    if (normalized.statusCode >= 500) {
      this.logger.error(
        { err: exception, requestId, path: request.url },
        'Unhandled exception',
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        statusCode: normalized.statusCode,
        details: normalized.details,
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(normalized.statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      // Our AppException / custom ValidationPipe factory both throw with an
      // object payload that already carries `code` (and optionally `details`).
      if (typeof payload === 'object' && payload !== null) {
        const asRecord = payload as Record<string, unknown>;
        const code =
          typeof asRecord.code === 'string'
            ? asRecord.code
            : (STATUS_TO_FALLBACK_CODE[statusCode] ?? ErrorCode.INTERNAL_SERVER_ERROR);
        const message =
          typeof asRecord.message === 'string' ? asRecord.message : exception.message;
        const details = Array.isArray(asRecord.details)
          ? (asRecord.details as ApiFieldError[])
          : undefined;

        return { code, message, statusCode, details };
      }

      return {
        code: STATUS_TO_FALLBACK_CODE[statusCode] ?? ErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        statusCode,
      };
    }

    // Unknown / unexpected error - never leak details to the client.
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}
