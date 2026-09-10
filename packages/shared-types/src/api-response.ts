/**
 * Canonical API response envelope used by every endpoint in the platform.
 *
 * The backend NEVER returns raw arrays/objects at the top level, and NEVER
 * returns translated error messages - only stable `code` values. The
 * frontend is responsible for mapping `code` to a localized string via
 * next-intl. This keeps the contract stable for future consumers
 * (mobile app, MIS/SIS integrations) regardless of UI language.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiError {
  /** Stable, machine-readable identifier, e.g. "AUTH_INVALID_CREDENTIALS" */
  code: string;
  /** Non-localized, developer-facing description (never shown to end users) */
  message: string;
  /** HTTP status code, duplicated here for clients that don't inspect headers */
  statusCode: number;
  /** Optional field-level validation errors */
  details?: ApiFieldError[];
  /** Correlation id for tracing this request through logs */
  requestId?: string;
  timestamp: string;
  path?: string;
}

export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiResponseMeta {
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
