import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { Observable, catchError, defer, of, retry, switchMap, throwError, timer } from 'rxjs';
import { CSRF_HEADER, CsrfService } from '../guest/csrf.service';
import { toApiError } from './api-error';
import { ApiErrorStore } from './api-error-store';
import { sameOriginApiUrl } from './api-origin';

const transientStatuses = new Set([0, 502, 503, 504]);

export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const url = sameOriginApiUrl(request.url, inject(DOCUMENT).location?.origin ?? '');
  if (!url) return next(request);

  const errors = inject(ApiErrorStore);
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const csrf = mutation ? inject(CsrfService) : null;
  // Il contratto garantisce deduplica solo per questo endpoint, non per ogni POST.
  const keyedGuess =
    request.method === 'POST' &&
    /^\/api\/v1\/sessions\/[^/]+\/word\/guesses$/.test(url.pathname) &&
    !!request.headers.get('Idempotency-Key')?.trim();
  const mayRetry = request.method === 'GET' || keyedGuess;

  const token$: Observable<string | null> = csrf ? csrf.getToken() : of(null);
  return token$.pipe(
    switchMap((token) => {
      const outgoing = request.clone({
        credentials: 'same-origin',
        withCredentials: false,
        transferCache: false,
        timeout: request.timeout ?? 10_000,
        headers: token
          ? request.headers.set(CSRF_HEADER, token)
          : request.headers.delete(CSRF_HEADER),
      });
      return defer(() => next(outgoing)).pipe(
        retry({
          count: 2,
          delay: (error: unknown, attempt) =>
            mayRetry && error instanceof HttpErrorResponse && transientStatuses.has(error.status)
              ? timer(250 * 2 ** (attempt - 1))
              : throwError(() => error),
        }),
        catchError((error: unknown) => {
          if (token && error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
            csrf?.invalidate(token);
          }
          return throwError(() => error);
        }),
      );
    }),
    catchError((error: unknown) => {
      const safe = toApiError(error);
      errors.show(safe);
      return throwError(() => safe);
    }),
  );
};
