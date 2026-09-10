import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';
import type { ApiResponseMeta, ApiSuccessResponse } from '@cca/shared-types';

/**
 * A controller method may return either a plain payload (wrapped as-is
 * into `data`) or `{ data, meta }` (e.g. to attach pagination) which this
 * interceptor unpacks. Never return the envelope shape yourself.
 */
export interface WithMeta<T> {
  data: T;
  meta: ApiResponseMeta;
}

function hasMeta<T>(value: unknown): value is WithMeta<T> {
  return (
    typeof value === 'object' && value !== null && 'data' in value && 'meta' in value
  );
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((payload: T | WithMeta<T>) => {
        const requestId = (request as unknown as { id?: string }).id;
        const base = hasMeta<T>(payload)
          ? { data: payload.data, meta: { ...payload.meta, requestId } }
          : { data: payload as T, meta: requestId ? { requestId } : undefined };

        return {
          success: true as const,
          data: base.data,
          ...(base.meta ? { meta: base.meta } : {}),
        };
      }),
    );
  }
}
