import { Injectable, signal } from '@angular/core';
import { ApiError } from './api-error';

@Injectable({ providedIn: 'root' })
export class ApiErrorStore {
  private readonly current = signal<ApiError | null>(null);
  readonly error = this.current.asReadonly();

  show(error: ApiError): void {
    this.current.set(error);
  }
  dismiss(): void {
    this.current.set(null);
  }
}
