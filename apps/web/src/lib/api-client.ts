import type { ApiResponse } from '@cca/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Thin fetch wrapper around the NestJS API. Every response is expected to
 * follow the shared `ApiResponse<T>` envelope - on `success: false` this
 * throws `ApiRequestError` with the machine-readable `code` so callers (or a
 * shared React Query error handler) can map it to a localized message via
 * next-intl's `errors.<code>` namespace instead of showing raw API text.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    credentials: 'include',
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new ApiRequestError(
      body.error.message,
      body.error.code,
      body.error.statusCode,
      body.error.details,
    );
  }

  return body.data;
}
