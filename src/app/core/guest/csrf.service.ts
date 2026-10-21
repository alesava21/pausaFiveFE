import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, defer, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { CsrfDto } from '../api/api-contracts';
import { ApiError } from '../api/api-error';

export const CSRF_HEADER = 'X-CSRF-TOKEN';

function csrfToken(value: unknown): string {
  const dto = value as Partial<CsrfDto> | null;
  if (
    !dto ||
    dto.headerName !== CSRF_HEADER ||
    typeof dto.token !== 'string' ||
    dto.token.length === 0 ||
    dto.token.length > 4096 ||
    /[^\x21-\x7e]/.test(dto.token)
  ) {
    throw new ApiError(503, 'client');
  }
  return dto.token;
}

@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private token: string | undefined;
  private pending: Observable<string> | undefined;

  getToken(): Observable<string> {
    return defer(() => {
      if (!this.browser) return throwError(() => new ApiError(503, 'client'));
      if (this.token) return of(this.token);
      this.pending ??= this.http.get<unknown>('/api/v1/csrf', { transferCache: false }).pipe(
        map(csrfToken),
        tap((token) => {
          this.token = token;
        }),
        finalize(() => {
          this.pending = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
      return this.pending;
    });
  }

  /** Una risposta tardiva non deve cancellare un token successivo. */
  invalidate(rejectedToken: string): void {
    if (this.token === rejectedToken) this.token = undefined;
  }
}
