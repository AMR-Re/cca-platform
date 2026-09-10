/**
 * Central catalogue of stable API error codes.
 * The frontend maps each code to a localized message via next-intl.
 * Add new codes here rather than inventing ad-hoc strings in either app.
 */
export enum ErrorCode {
  // Generic
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',

  // Auth (reserved for Phase 3)
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',

  // Tenancy (reserved for Phase 2+)
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  CROSS_TENANT_ACCESS_DENIED = 'CROSS_TENANT_ACCESS_DENIED',
}
