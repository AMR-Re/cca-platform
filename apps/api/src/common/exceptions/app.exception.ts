import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@cca/shared-types';

/**
 * Base class for all deliberately-thrown application errors.
 *
 * Use this (or a subclass) instead of throwing NestJS's built-in
 * exceptions directly when you want control over the `code` returned to
 * clients. Framework-level errors (validation pipe, unknown routes,
 * unexpected throws) are still normalized by AllExceptionsFilter.
 */
export class AppException extends HttpException {
  public readonly code: ErrorCode | string;

  constructor(
    code: ErrorCode | string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, statusCode);
    this.code = code;
  }
}

export class NotFoundAppException extends AppException {
  constructor(message = 'Resource not found') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class CrossTenantAccessException extends AppException {
  constructor(message = 'Cross-tenant access is not permitted') {
    super(ErrorCode.CROSS_TENANT_ACCESS_DENIED, message, HttpStatus.FORBIDDEN);
  }
}
