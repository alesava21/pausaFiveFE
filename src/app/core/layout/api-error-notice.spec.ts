import { TestBed } from '@angular/core/testing';
import { ApiError } from '../api/api-error';
import { ApiErrorStore } from '../api/api-error-store';
import { ApiErrorNotice } from './api-error-notice';

it.each([401, 403, 409, 422, 429, 503])(
  'visualizza un avviso italiano per %i e consente di chiuderlo senza ripetere richieste',
  async (status) => {
    const fixture = TestBed.createComponent(ApiErrorNotice);
    const store = TestBed.inject(ApiErrorStore);
    store.show(new ApiError(status, 'problem'));
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(store.error()?.message);
    const close = root.querySelector('button') as HTMLButtonElement;
    close.focus();
    expect(document.activeElement).toBe(close);
    close.click();
    await fixture.whenStable();
    expect(store.error()).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  },
);
