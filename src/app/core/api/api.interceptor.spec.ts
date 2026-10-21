import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CsrfService } from '../guest/csrf.service';
import { ApiError } from './api-error';
import { ApiErrorStore } from './api-error-store';
import { sameOriginApiUrl } from './api-origin';
import { provideApi } from './provide-api';

const guessUrl = '/api/v1/sessions/test-session/word/guesses';
const csrfDto = { headerName: 'X-CSRF-TOKEN', token: 'opaque-csrf-secret' };

describe('HTTP API e CSRF', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApi(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    mock.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function prepareToken() {
    TestBed.inject(CsrfService).getToken().subscribe();
    const request = mock.expectOne('/api/v1/csrf');
    expect(request.request.transferCache).toBe(false);
    request.flush(csrfDto);
  }

  it('le letture non richiedono token e non finiscono nella transfer cache', () => {
    http.get('/api/v1/games').subscribe();
    const request = mock.expectOne('/api/v1/games');
    expect(request.request.headers.has('X-CSRF-TOKEN')).toBe(false);
    expect(request.request.credentials).toBe('same-origin');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.transferCache).toBe(false);
    expect(request.request.timeout).toBe(10000);
    request.flush({ games: [] });
  });

  it('condivide un solo caricamento CSRF fra mutazioni concorrenti e usa il token in memoria', () => {
    for (const method of ['POST', 'PATCH', 'DELETE'])
      http.request(method, '/api/v1/test', { body: {} }).subscribe();
    mock.expectNone('/api/v1/test');
    mock.expectOne('/api/v1/csrf').flush(csrfDto);
    const requests = mock.match('/api/v1/test');
    expect(requests).toHaveLength(3);
    for (const request of requests) {
      expect(request.request.headers.get('X-CSRF-TOKEN')).toBe(csrfDto.token);
      expect(request.request.headers.has('Cookie')).toBe(false);
      request.flush({});
    }
    http.post('/api/v1/test', {}).subscribe();
    mock.expectNone('/api/v1/csrf');
    mock.expectOne('/api/v1/test').flush({});
  });

  it('accetta URL assoluti della stessa origin e sostituisce un header CSRF obsoleto', () => {
    prepareToken();
    const origin = TestBed.inject(DOCUMENT).location.origin;
    http.post(origin + '/api/v1/test', {}, { headers: { 'X-CSRF-TOKEN': 'stale' } }).subscribe();
    const request = mock.expectOne(origin + '/api/v1/test');
    expect(request.request.headers.get('X-CSRF-TOKEN')).toBe(csrfDto.token);
    request.flush({});
  });

  it.each([
    'https://outside.invalid/api/v1/test',
    '//outside.invalid/api/v1/test',
    '/assets/test',
    '/api/v10/test',
  ])('non aggiunge token a %s', (url) => {
    http.post(url, {}).subscribe();
    mock.expectNone('/api/v1/csrf');
    const request = mock.expectOne(url);
    expect(request.request.headers.has('X-CSRF-TOKEN')).toBe(false);
    request.flush({});
  });

  it.each([
    'api/v1/test',
    'https://local.invalid/api/v10/test',
    'https://user:pass@local.invalid/api/v1/test',
    'data:application/json,{}',
    '/\\outside.invalid/api/v1/test',
  ])('rifiuta la classificazione API per URL ambigue %s', (url) => {
    expect(sameOriginApiUrl(url, 'https://local.invalid')).toBeNull();
  });

  it('ritenta GET su 503 con backoff limitato a due retry', async () => {
    vi.useFakeTimers();
    let result: ApiError | undefined;
    http.get('/api/v1/games').subscribe({
      error: (error: ApiError) => {
        result = error;
      },
    });
    mock.expectOne('/api/v1/games').flush({}, { status: 503, statusText: 'Unavailable' });
    mock.expectNone('/api/v1/games');
    await vi.advanceTimersByTimeAsync(249);
    mock.expectNone('/api/v1/games');
    await vi.advanceTimersByTimeAsync(1);
    mock.expectOne('/api/v1/games').flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(500);
    mock.expectOne('/api/v1/games').flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(1000);
    mock.expectNone('/api/v1/games');
    expect(result?.status).toBe(503);
    expect(TestBed.inject(ApiErrorStore).error()).toBe(result);
  });

  it.each([401, 403, 409, 422, 429])('non ripete letture con status %i', async (status) => {
    vi.useFakeTimers();
    http.get('/api/v1/games').subscribe({ error: () => undefined });
    mock.expectOne('/api/v1/games').flush({}, { status, statusText: 'Rejected' });
    await vi.advanceTimersByTimeAsync(5000);
    mock.expectNone('/api/v1/games');
  });

  it('non ripete guess senza chiave dopo un errore di rete', async () => {
    vi.useFakeTimers();
    prepareToken();
    http.post(guessUrl, { guess: 'CANNE' }).subscribe({ error: () => undefined });
    mock.expectOne(guessUrl).error(new ProgressEvent('error'));
    await vi.advanceTimersByTimeAsync(5000);
    mock.expectNone(guessUrl);
  });

  it('ripete guess con chiave conservando body, chiave e token identici', async () => {
    vi.useFakeTimers();
    prepareToken();
    const body = { guess: 'CANNE' };
    const headers = new HttpHeaders({ 'Idempotency-Key': 'same-key' });
    http.post(guessUrl, body, { headers }).subscribe();
    const first = mock.expectOne(guessUrl);
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(250);
    const second = mock.expectOne(guessUrl);
    expect(second.request.body).toBe(body);
    expect(second.request.headers.get('Idempotency-Key')).toBe('same-key');
    expect(second.request.headers.get('X-CSRF-TOKEN')).toBe(csrfDto.token);
    second.flush({});
  });

  it.each(['/api/v1/daily/word/sessions', '/api/v1/sessions/test/sudoku/finish'])(
    'non deduce idempotenza per %s dalla sola presenza di una chiave',
    async (url) => {
      vi.useFakeTimers();
      prepareToken();
      http
        .post(url, {}, { headers: { 'Idempotency-Key': 'key' } })
        .subscribe({ error: () => undefined });
      mock.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
      await vi.advanceTimersByTimeAsync(5000);
      mock.expectNone(url);
    },
  );

  it.each([401, 403])('invalida il token con %i senza reinviare la mutazione', (status) => {
    prepareToken();
    http.post(guessUrl, {}).subscribe({ error: () => undefined });
    mock.expectOne(guessUrl).flush({}, { status, statusText: 'Rejected' });
    mock.expectNone(guessUrl);
    mock.expectNone('/api/v1/csrf');
    http.post(guessUrl, {}).subscribe();
    mock.expectOne('/api/v1/csrf').flush({ ...csrfDto, token: 'new-token' });
    const next = mock.expectOne(guessUrl);
    expect(next.request.headers.get('X-CSRF-TOKEN')).toBe('new-token');
    next.flush({});
  });

  it.each([
    { headerName: 'Authorization', token: 'opaque' },
    { headerName: 'X-CSRF-TOKEN', token: 'bad\r\nvalue' },
    { headerName: 'X-CSRF-TOKEN', token: '' },
    null,
  ])('blocca la mutazione se il token ricevuto non è valido', (payload) => {
    let error: ApiError | undefined;
    http.post(guessUrl, {}).subscribe({
      error: (value: ApiError) => {
        error = value;
      },
    });
    mock.expectOne('/api/v1/csrf').flush(payload);
    mock.expectNone(guessUrl);
    expect(error?.kind).toBe('client');
    expect(error?.message).not.toContain('opaque');
    // L’errore non avvelena la cache: un’azione successiva può ricaricare il token.
    http.post(guessUrl, {}).subscribe();
    mock.expectOne('/api/v1/csrf').flush(csrfDto);
    mock.expectOne(guessUrl).flush({});
  });

  it('una risposta 403 tardiva non cancella il token ottenuto nel frattempo', () => {
    prepareToken();
    http.post(guessUrl, {}).subscribe({ error: () => undefined });
    http.post(guessUrl, {}).subscribe({ error: () => undefined });
    const pending = mock.match(guessUrl);
    expect(pending).toHaveLength(2);
    pending[0].flush({}, { status: 403, statusText: 'Forbidden' });
    http.post(guessUrl, {}).subscribe();
    mock.expectOne('/api/v1/csrf').flush({ ...csrfDto, token: 'newer-token' });
    mock.expectOne(guessUrl).flush({});
    pending[1].flush({}, { status: 403, statusText: 'Forbidden' });
    http.post(guessUrl, {}).subscribe();
    mock.expectNone('/api/v1/csrf');
    const next = mock.expectOne(guessUrl);
    expect(next.request.headers.get('X-CSRF-TOKEN')).toBe('newer-token');
    next.flush({});
  });

  it('un errore nel caricamento CSRF blocca la mossa e consente un nuovo caricamento esplicito', () => {
    http.post(guessUrl, {}).subscribe({ error: () => undefined });
    mock.expectOne('/api/v1/csrf').flush({}, { status: 403, statusText: 'Forbidden' });
    mock.expectNone(guessUrl);
    http.post(guessUrl, {}).subscribe();
    mock.expectOne('/api/v1/csrf').flush(csrfDto);
    mock.expectOne(guessUrl).flush({});
  });

  it('non legge cookie né scrive token nello storage o nella console', () => {
    const cookie = vi.spyOn(document, 'cookie', 'get');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const logs = ['log', 'info', 'warn', 'error', 'debug'].map((level) =>
      vi.spyOn(console, level as 'log'),
    );
    http.post(guessUrl, {}).subscribe({ error: () => undefined });
    mock.expectOne('/api/v1/csrf').flush(csrfDto);
    mock.expectOne(guessUrl).flush({ detail: 'secret' }, { status: 403, statusText: 'Forbidden' });
    expect(cookie).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
});

describe('CSRF durante prerender', () => {
  it('non carica o trasferisce token sul server', () => {
    TestBed.configureTestingModule({
      providers: [
        provideApi(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const mock = TestBed.inject(HttpTestingController);
    let result: ApiError | undefined;
    TestBed.inject(CsrfService)
      .getToken()
      .subscribe({
        error: (value: ApiError) => {
          result = value;
        },
      });
    expect(result?.kind).toBe('client');
    mock.expectNone('/api/v1/csrf');
    mock.verify();
  });
});
