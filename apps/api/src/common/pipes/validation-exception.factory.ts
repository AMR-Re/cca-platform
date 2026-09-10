import { BadRequestException, ValidationError } from '@nestjs/common';
import { ErrorCode } from '@cca/shared-types';
import type { ApiFieldError } from '@cca/shared-types';

function flatten(errors: ValidationError[], parentPath = ''): ApiFieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors: ApiFieldError[] = error.constraints
      ? Object.entries(error.constraints).map(([code, message]) => ({
          field,
          code,
          message,
        }))
      : [];
    const childErrors = error.children?.length ? flatten(error.children, field) : [];
    return [...ownErrors, ...childErrors];
  });
}

/**
 * Passed to the global ValidationPipe so DTO validation failures come out
 * as a structured `ApiFieldError[]` (one entry per invalid field) instead
 * of class-validator's default flat string array - this is what
 * AllExceptionsFilter reads into `error.details`.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const details = flatten(errors);
  return new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: 'Validation failed',
    details,
  });
}
