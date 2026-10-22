import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WordSessionDto } from '../../core/api/api-contracts';
import { ApiError } from '../../core/api/api-error';
import { WordClient } from './word-client';
import { WordPage } from './word-page';
import { of, throwError } from 'rxjs';

const active: WordSessionDto = {
  sessionId: 'session-test',
  puzzleId: 'puzzle-test',
  mode: 'DAILY',
  status: 'ACTIVE',
  attempts: [],
  remainingAttempts: 6,
  serverDate: '2026-10-21',
  nextResetAt: '2026-10-22T00:00:00+02:00',
};

describe('Parola segreta con autorità server', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-21T12:00:00+02:00'));
    TestBed.configureTestingModule({
      imports: [WordPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  async function page(mode: 'DAILY' | 'ENDLESS' = 'DAILY', state: WordSessionDto = active) {
    const fixture = TestBed.createComponent(WordPage);
    fixture.componentRef.setInput('heading', 'Parola segreta');
    fixture.componentRef.setInput('description', 'Indovina la parola.');
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/v1/${mode === 'DAILY' ? 'daily' : 'endless'}/word/sessions`)
      .flush({ ...state, mode });
    fixture.detectChanges();
    return fixture;
  }

  it('apre o riprende senza richiedere dizionari o soluzioni pubbliche', async () => {
    const fixture = await page('ENDLESS');
    expect(fixture.componentInstance.game()?.sessionId).toBe(active.sessionId);
    expect(fixture.nativeElement.textContent).not.toContain('La parola era');
    expect(fixture.nativeElement.querySelectorAll('.tile')).toHaveLength(30);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#word-guess'));
    TestBed.inject(HttpTestingController).expectNone((request) =>
      /assets|dictionary/.test(request.url),
    );
  });

  it('mostra Essenziale senza tastiera a schermo e consente di cancellare dal campo', async () => {
    const fixture = await page();
    const input = fixture.nativeElement.querySelector('#word-guess') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('.keyboard')).toBeNull();
    expect(fixture.nativeElement.querySelector('.word-row input')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Partita conclusa');
    input.value = 'GATTO';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('.word-row.current');
    expect(
      [...row.querySelectorAll('.tile')]
        .map((tile) => (tile as HTMLElement).textContent?.trim())
        .join(''),
    ).toBe('GATTO');
    fixture.nativeElement.querySelector('.erase').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.guess).toBe('GATT');
    expect(document.activeElement).toBe(input);
    TestBed.inject(HttpTestingController).expectNone((request) => request.url.endsWith('/guesses'));
  });

  it('invia con Invio e mantiene il campo pronto per il tentativo successivo', async () => {
    const fixture = await page();
    const input = fixture.nativeElement.querySelector('#word-guess') as HTMLInputElement;
    input.value = 'libro';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.guess).toBe('libro');
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    expect(request.request.body).toEqual({ guess: 'LIBRO' });
    request.flush({ status: 'ACTIVE' });
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush({
      ...active,
      remainingAttempts: 5,
      attempts: [
        { guess: 'LIBRO', evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'] },
      ],
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelectorAll('.word-row')[1].classList.contains('current'),
    ).toBe(true);
    expect(fixture.componentInstance.guess).toBe('');
    const nextInput = fixture.nativeElement.querySelector('#word-guess') as HTMLInputElement;
    expect(nextInput).toBe(input);
    expect(document.activeElement).toBe(nextInput);
    nextInput.value = 'treno';
    nextInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.guess).toBe('treno');
  });

  it('mostra gli indizi server per le lettere ripetute e blocca modifiche durante un retry incerto', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    component.game.set({
      ...active,
      attempts: [
        { guess: 'GATTO', evaluation: ['ABSENT', 'PRESENT', 'CORRECT', 'ABSENT', 'ABSENT'] },
      ],
      remainingAttempts: 5,
    });
    component.guess = 'LIBRO';
    component.pending.set({ guess: 'LIBRO', key: 'pending-key' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const letters = fixture.nativeElement.querySelectorAll('.word-row:first-child .tile');
    expect(letters[2].classList.contains('correct')).toBe(true);
    expect(letters[3].classList.contains('absent')).toBe(true);
    expect(fixture.nativeElement.querySelector('#word-guess').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.erase').disabled).toBe(true);
    component.erase();
    expect(component.guess).toBe('LIBRO');
  });

  it('rifiuta input malformati prima della rete', async () => {
    const fixture = await page();
    for (const guess of [' GATTO', 'CITTÀ', 'ſERPE', 'ABCD', 'AB123']) {
      fixture.componentInstance.guess = guess;
      fixture.componentInstance.submit();
      expect(fixture.componentInstance.message()).toContain('cinque lettere');
    }
    TestBed.inject(HttpTestingController).expectNone((request) => request.url.endsWith('/guesses'));
  });

  it('mantiene la chiave idempotente dopo esito di rete incerto e aggiorna da stato server', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    component.guess = 'avevo';
    component.submit();
    const http = TestBed.inject(HttpTestingController);
    const first = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    const key = first.request.headers.get('Idempotency-Key');
    expect(first.request.body).toEqual({ guess: 'AVEVO' });
    first.error(new ProgressEvent('network'));
    expect(component.pending()?.key).toBe(key);
    component.submit();
    const retry = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({
      status: 'ACTIVE',
      attemptNumber: 1,
      remainingAttempts: 5,
      completed: false,
      won: false,
      evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'],
    });
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush({
      ...active,
      remainingAttempts: 5,
      attempts: [
        { guess: 'AVEVO', evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'] },
      ],
    });
    fixture.detectChanges();
    expect(component.pending()).toBeNull();
    expect(component.game()?.attempts).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.sr-only')?.textContent).toContain('assente');
    expect(fixture.nativeElement.textContent).not.toContain('La parola era');
  });

  it('mostra la soluzione soltanto dopo il completamento e avvia una nuova endless esplicita', async () => {
    const fixture = await page('ENDLESS');
    fixture.componentInstance.game.set({
      ...active,
      mode: 'ENDLESS',
      status: 'WON',
      solution: 'GATTO',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('GATTO');
    fixture.componentInstance.open(true);
    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/endless/word/sessions',
    );
    expect(request.request.body).toEqual({ newGame: true });
    request.flush({ ...active, mode: 'ENDLESS', sessionId: 'another-session' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('GATTO');
  });

  it('spiega che le parole sono in preparazione se non ci sono approvazioni', async () => {
    const fixture = await page();
    const client = TestBed.inject(WordClient);
    vi.spyOn(client, 'open').mockReturnValue(throwError(() => new ApiError(503, 'problem')));
    fixture.componentInstance.open();
    expect(fixture.componentInstance.message()).toContain('in preparazione');
  });
  it('blocca doppi invii finché POST e rilettura della sessione sono pendenti', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.guess = 'LIBRO';
    component.submit();
    component.submit();
    const request = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    request.flush({ status: 'ACTIVE' });
    component.submit();
    http.expectNone((request) => request.url.endsWith('/guesses'));
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush(active);
    expect(component.busy()).toBe(false);
  });

  it.each([422, 429])(
    'gestisce %s senza consumare tentativi o perdere la parola',
    async (status) => {
      const fixture = await page();
      const component = fixture.componentInstance;
      vi.spyOn(TestBed.inject(WordClient), 'guess').mockReturnValue(
        throwError(() => new ApiError(status, 'problem')),
      );
      component.guess = 'LIBRO';
      component.submit();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.pending()).toBeNull();
      expect(component.game()?.remainingAttempts).toBe(6);
      expect(component.guess).toBe('LIBRO');
      expect(component.message()).toContain(status === 422 ? 'dizionario' : 'Attendi');
      expect(fixture.nativeElement.querySelector('#word-guess').disabled).toBe(false);
    },
  );

  it('recupera lo stato autorevole dopo 409 e non offre altre mosse se EXPIRED', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    vi.spyOn(TestBed.inject(WordClient), 'guess').mockReturnValue(
      throwError(() => new ApiError(409, 'problem')),
    );
    component.guess = 'LIBRO';
    component.submit();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/v1/sessions/${active.sessionId}`)
      .flush({ ...active, status: 'EXPIRED' });
    fixture.detectChanges();
    expect(component.game()?.status).toBe('EXPIRED');
    expect(component.busy()).toBe(false);
    expect(fixture.nativeElement.querySelector('#word-guess')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Apri la sfida di oggi');
    expect(fixture.nativeElement.textContent).not.toContain('La parola era');
  });

  it('mantiene la stessa chiave anche se fallisce la lettura dopo un POST accettato', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.guess = 'LIBRO';
    component.submit();
    const post = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    const key = post.request.headers.get('Idempotency-Key');
    post.flush({ status: 'ACTIVE' });
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).error(new ProgressEvent('offline'));
    component.submit();
    const retry = http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`);
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush({ status: 'ACTIVE' });
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush(active);
  });

  it('riprende la stessa sessione e la cronologia dopo la ricreazione della pagina', async () => {
    const first = await page();
    first.destroy();
    const fixture = await page();
    fixture.componentInstance.open();
    const attempt = {
      guess: 'LIBRO',
      evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'],
    };
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/daily/word/sessions')
      .flush({
        ...active,
        attempts: [attempt],
        remainingAttempts: 5,
      });
    fixture.detectChanges();
    expect(fixture.componentInstance.game()?.sessionId).toBe(active.sessionId);
    expect(fixture.nativeElement.querySelector('.word-row').textContent).toContain('L');
    expect(fixture.nativeElement.textContent).toContain('tentativo 2 di 6');
  });

  it.each(['DAILY', 'ENDLESS'] as const)(
    'chiude %s al sesto tentativo e mostra la soluzione soltanto ricevuto LOST',
    async (mode) => {
      const fixture = await page(mode);
      const component = fixture.componentInstance;
      const attempt = {
        guess: 'LIBRO',
        evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'] as const,
      };
      component.game.set({
        ...active,
        mode,
        attempts: Array(5).fill(attempt),
        remainingAttempts: 1,
      });
      component.guess = 'TRENO';
      component.submit();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`).flush({ status: 'LOST' });
      http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush({
        ...active,
        mode,
        status: 'LOST',
        attempts: Array(6).fill(attempt),
        remainingAttempts: 0,
        solution: 'GATTO',
      });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('#word-guess')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('GATTO');
      component.submit();
      http.expectNone((request) => request.url.endsWith('/guesses'));
    },
  );

  it.each([
    ['2026-03-29T00:00:00+01:00', '2026-03-30T00:00:00+02:00', '23:00:00'],
    ['2026-10-25T00:00:00+02:00', '2026-10-26T00:00:00+01:00', '25:00:00'],
  ])('usa il reset server con cambio ora legale %s', async (now, reset, expected) => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now));
    const fixture = await page();
    fixture.componentInstance.game.set({ ...active, nextResetAt: reset });
    fixture.detectChanges();
    expect(fixture.componentInstance.countdown()).toBe(expected);
    expect(fixture.nativeElement.textContent).toContain('00:00 (ora italiana)');
    expect(fixture.nativeElement.querySelector('.daily-timing').getAttribute('aria-live')).toBe(
      'off',
    );
  });

  it('aggiorna il countdown e blocca la mossa al reset anche rientrando da una scheda sospesa', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    expect(component.countdown()).toBe('12:00:00');
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(active.nextResetAt));
    document.dispatchEvent(new Event('visibilitychange'));
    fixture.detectChanges();
    expect(component.countdown()).toBe('00:00:00');
    expect(fixture.nativeElement.querySelector('#word-guess')).toBeNull();
    component.guess = 'LIBRO';
    component.submit();
    TestBed.inject(HttpTestingController).expectNone((request) => request.url.endsWith('/guesses'));
    component.open();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/daily/word/sessions')
      .flush({
        ...active,
        sessionId: 'new-day',
        serverDate: '2026-10-22',
        nextResetAt: '2026-10-23T00:00:00+02:00',
      });
    fixture.detectChanges();
    expect(component.resetReached()).toBe(false);
    expect(fixture.nativeElement.querySelector('#word-guess')).not.toBeNull();
  });

  it('controlla il tempo anche prima dell’invio e non applica scadenza alla modalità illimitata', async () => {
    const fixture = await page('ENDLESS');
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(active.nextResetAt) + 1000);
    fixture.componentInstance.guess = 'LIBRO';
    fixture.componentInstance.submit();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`/api/v1/sessions/${active.sessionId}/word/guesses`).flush({ status: 'ACTIVE' });
    http.expectOne(`/api/v1/sessions/${active.sessionId}`).flush({ ...active, mode: 'ENDLESS' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.daily-timing')).toBeNull();
    expect(fixture.componentInstance.resetReached()).toBe(false);
  });
  it('aggiorna ogni secondo e rimuove timer e listener alla distruzione', async () => {
    const interval = vi.spyOn(window, 'setInterval');
    const clear = vi.spyOn(window, 'clearInterval');
    const fixture = await page();
    const component = fixture.componentInstance;
    const index = interval.mock.calls.findIndex(([, delay]) => delay === 1000);
    expect(index).toBeGreaterThanOrEqual(0);
    const tick = interval.mock.calls[index][0];
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-21T12:00:01+02:00'));
    if (typeof tick === 'function') tick();
    expect(component.countdown()).toBe('11:59:59');
    fixture.destroy();
    expect(clear).toHaveBeenCalledWith(interval.mock.results[index].value);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(active.nextResetAt));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.countdown()).toBe('11:59:59');
  });

  it('non invia oltre il reset anche se il timer non è ancora scattato', async () => {
    const fixture = await page();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(active.nextResetAt));
    fixture.componentInstance.guess = 'LIBRO';
    fixture.componentInstance.submit();
    expect(fixture.componentInstance.resetReached()).toBe(true);
    TestBed.inject(HttpTestingController).expectNone((request) => request.url.endsWith('/guesses'));
  });
  it('collega endless alla sfida giornaliera e alle regole senza avviare altre partite', async () => {
    const fixture = await page('ENDLESS');
    expect(
      fixture.nativeElement.querySelector('a[href="/parola-del-giorno"]').textContent,
    ).toContain('giorno');
    expect(fixture.nativeElement.querySelector('a[href="/come-si-gioca"]').textContent).toContain(
      'Come si gioca',
    );
    expect(fixture.nativeElement.textContent).toContain('serve una connessione');
    TestBed.inject(HttpTestingController).expectNone('/api/v1/daily/word/sessions');
  });

  it('impedisce di sostituire una endless ancora attiva e non mostra il comando', async () => {
    const fixture = await page('ENDLESS');
    fixture.componentInstance.open(true);
    expect(fixture.nativeElement.textContent).not.toContain('Nuova parola');
    TestBed.inject(HttpTestingController).expectNone('/api/v1/endless/word/sessions');
  });

  it('recupera la nuova endless dopo una risposta persa senza ripetere la creazione', async () => {
    const fixture = await page('ENDLESS', { ...active, status: 'WON', solution: 'GATTO' });
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.open(true);
    component.open(true);
    const start = http.expectOne('/api/v1/endless/word/sessions');
    expect(start.request.body).toEqual({ newGame: true });
    start.error(new ProgressEvent('network'));
    fixture.detectChanges();
    expect(component.startUncertain()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Recupera partita');
    expect(fixture.nativeElement.textContent).not.toContain('Nuova parola');
    component.open(true);
    http.expectNone('/api/v1/endless/word/sessions');
    const recover = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLButtonElement).textContent?.includes('Recupera partita'),
    ) as HTMLButtonElement;
    recover.click();
    const resume = http.expectOne('/api/v1/endless/word/sessions');
    expect(resume.request.body).toEqual({ newGame: false });
    resume.flush({ ...active, mode: 'ENDLESS', sessionId: 'created-before-network-failure' });
    fixture.detectChanges();
    expect(component.game()?.sessionId).toBe('created-before-network-failure');
    expect(component.startUncertain()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('GATTO');
    expect(fixture.nativeElement.querySelector('#word-guess')).not.toBeNull();
    http.expectNone('/api/v1/daily/word/sessions');
  });

  it('riprende invece di ricreare se un’altra scheda ha già iniziato una endless (409)', async () => {
    const fixture = await page('ENDLESS', { ...active, status: 'LOST', solution: 'GATTO' });
    const client = TestBed.inject(WordClient);
    const open = vi
      .spyOn(client, 'open')
      .mockReturnValueOnce(throwError(() => new ApiError(409, 'problem')))
      .mockReturnValueOnce(of({ ...active, mode: 'ENDLESS', sessionId: 'other-tab' }));
    fixture.componentInstance.open(true);
    expect(open.mock.calls).toEqual([
      ['ENDLESS', true],
      ['ENDLESS', false],
    ]);
    expect(fixture.componentInstance.game()?.sessionId).toBe('other-tab');
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(fixture.componentInstance.startUncertain()).toBe(false);
  });

  it('conserva la possibilità di recupero se anche il primo recupero fallisce', async () => {
    const fixture = await page('ENDLESS', { ...active, status: 'WON', solution: 'GATTO' });
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.open(true);
    http.expectOne('/api/v1/endless/word/sessions').error(new ProgressEvent('network'));
    component.open();
    http.expectOne('/api/v1/endless/word/sessions').error(new ProgressEvent('network'));
    expect(component.startUncertain()).toBe(true);
    expect(component.busy()).toBe(false);
    component.open();
    const last = http.expectOne('/api/v1/endless/word/sessions');
    expect(last.request.body).toEqual({ newGame: false });
    // If creation never reached the server, recovering the old terminal game is valid too.
    last.flush({ ...active, mode: 'ENDLESS', status: 'WON', solution: 'GATTO' });
    fixture.detectChanges();
    expect(component.startUncertain()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Nuova parola');
  });

  it('riprende la cronologia endless dopo reload senza usare lo storage del browser', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage bloccato', 'SecurityError');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage bloccato', 'SecurityError');
    });
    const state: WordSessionDto = {
      ...active,
      mode: 'ENDLESS',
      remainingAttempts: 5,
      attempts: [
        { guess: 'LIBRO', evaluation: ['ABSENT', 'ABSENT', 'ABSENT', 'ABSENT', 'ABSENT'] },
      ],
    };
    const first = await page('ENDLESS', state);
    first.destroy();
    const second = await page('ENDLESS', state);
    expect(second.componentInstance.game()?.sessionId).toBe(state.sessionId);
    expect(second.componentInstance.game()?.attempts).toEqual(state.attempts);
    expect(second.nativeElement.textContent).toContain('tentativo 2 di 6');
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
