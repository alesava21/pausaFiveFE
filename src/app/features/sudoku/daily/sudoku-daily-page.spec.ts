import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { active, daily, now, solution } from '../../../../testing/fixtures/sudoku-daily';
import { provideApi } from '../../../core/api/provide-api';
import { SudokuDailyPage } from './sudoku-daily-page';

const finishUrl = `/api/v1/sessions/${active.sessionId}/sudoku/finish`;
const sessionUrl = `/api/v1/sessions/${active.sessionId}`;
const won = { status: 'WON', completed: true, elapsedSeconds: 140, errors: 0 };

describe('SudokuDailyPage DOM e HTTP', () => {
  let http: HttpTestingController;
  let fixtures: ComponentFixture<SudokuDailyPage>[];

  beforeEach(() => {
    // Keep real scheduling: faking all timers stalls Angular's zoneless render/RAF.
    // Only wall-clock time is fixed, so the daily never expires during a test.
    vi.spyOn(Date, 'now').mockReturnValue(now);
    localStorage.clear();
    fixtures = [];
    TestBed.configureTestingModule({
      imports: [SudokuDailyPage],
      providers: [provideApi(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      for (const fixture of fixtures) fixture.destroy();
      http.verify();
    } finally {
      vi.restoreAllMocks();
      localStorage.clear();
    }
  });

  async function render() {
    const fixture = TestBed.createComponent(SudokuDailyPage);
    fixtures.push(fixture);
    fixture.componentRef.setInput('heading', 'Sudoku del giorno');
    fixture.componentRef.setInput('description', 'La sfida di oggi.');
    // afterNextRender starts HTTP. Wait for this lifecycle before expectOne;
    // flush each dependency (daily -> CSRF -> session), then await the next render.
    await fixture.whenStable();
    return fixture;
  }

  async function page(session = active) {
    const fixture = await render();
    http.expectOne('/api/v1/daily/sudoku').flush(daily);
    const tokens = http.match('/api/v1/csrf');
    expect(tokens.length).toBeLessThanOrEqual(1);
    tokens[0]?.flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    const start = http.expectOne('/api/v1/daily/sudoku/sessions');
    expect(start.request.headers.get('X-CSRF-TOKEN')).toBe('test-csrf-token');
    start.flush(session);
    await fixture.whenStable();
    return fixture;
  }

  function cells(fixture: ComponentFixture<SudokuDailyPage>): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="gridcell"]'));
  }

  function button(fixture: ComponentFixture<SudokuDailyPage>, label: string): HTMLButtonElement {
    const found = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find(
      (b) =>
        b.getAttribute('role') !== 'gridcell' &&
        (b.textContent?.replace('Operazione in corso', '').trim() === label ||
          b.getAttribute('aria-label') === label),
    );
    expect(found, `Pulsante ${label}`).toBeDefined();
    return found!;
  }

  async function click(fixture: ComponentFixture<SudokuDailyPage>, target: HTMLElement) {
    target.click();
    await fixture.whenStable();
  }

  async function key(fixture: ComponentFixture<SudokuDailyPage>, value: string, ctrlKey = false) {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: value,
        ctrlKey,
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();
  }

  async function fill(fixture: ComponentFixture<SudokuDailyPage>) {
    for (let index = 0; index < 81; index++) {
      if (daily.givens[index]) continue;
      await click(fixture, cells(fixture)[index]);
      await key(fixture, String(solution[index]));
    }
    expect(button(fixture, 'Verifica')).toBeDefined();
  }

  function finish(fixture: ComponentFixture<SudokuDailyPage>, label = 'Verifica') {
    // Do not await a request by sleeping/advancing all timers. The DOM action
    // dispatches HTTP synchronously; control the response before asserting UI.
    button(fixture, label).click();
    const req = http.expectOne(finishUrl);
    expect(req.request.headers.get('X-CSRF-TOKEN')).toBe('test-csrf-token');
    return req;
  }

  it('aspetta afterNextRender, poi apre la sessione con CSRF e renderizza81 celle', async () => {
    const fixture = TestBed.createComponent(SudokuDailyPage);
    fixtures.push(fixture);
    fixture.componentRef.setInput('heading', 'Sudoku del giorno');
    fixture.componentRef.setInput('description', 'La sfida di oggi.');
    // The constructor registers afterNextRender; it has not run synchronously.
    http.expectNone('/api/v1/daily/sudoku');
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(0);
    const get = http.expectOne('/api/v1/daily/sudoku');
    expect(get.request.method).toBe('GET');
    get.flush(daily);
    http.expectOne('/api/v1/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    const start = http.expectOne('/api/v1/daily/sudoku/sessions');
    expect(start.request.body).toEqual({});
    expect(start.request.headers.get('X-CSRF-TOKEN')).toBe('test-csrf-token');
    expect(cells(fixture)).toHaveLength(0);
    start.flush(active);
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(81);
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Sudoku del giorno');
    expect(fixture.nativeElement.querySelector('.verify-cta')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(solution.join(','));
  });

  it('mantiene la selezione nel vero ordine focus poi click e dopo un secondo click', async () => {
    const fixture = await page();
    const cell = cells(fixture)[2];
    cell.focus();
    await click(fixture, cell);
    expect(document.activeElement).toBe(cell);
    expect(cell.getAttribute('aria-selected')).toBe('true');
    await click(fixture, cell);
    await key(fixture, '4');
    expect(cell.textContent?.trim()).toBe('4');
    expect(cell.getAttribute('aria-label')).toContain('valore 4');
    http.expectNone((r) => r.url.startsWith('/api/'));
  });

  it('ripristina il focus quando il click WebKit sfoca una cella già selezionata', async () => {
    const fixture = await page();
    const cell = cells(fixture)[10];
    cell.focus();
    await fixture.whenStable();
    expect(cell.getAttribute('aria-selected')).toBe('true');
    // WebKit can blur a focused native button as its mouse activation default.
    // Selection does not change, so an effect depending on its value won't rerun.
    cell.blur();
    expect(document.activeElement).not.toBe(cell);
    await click(fixture, cell);
    expect(document.activeElement).toBe(cell);
    await key(fixture, '7');
    expect(cell.textContent?.trim()).toBe('7');
  });

  it('impedisce di modificare o cancellare i givens via tastiera, note e keypad', async () => {
    const fixture = await page();
    const given = cells(fixture)[0];
    await click(fixture, given);
    expect(button(fixture, '9').disabled).toBe(true);
    expect(button(fixture, 'Cancella').disabled).toBe(true);
    await key(fixture, '9');
    await key(fixture, 'Backspace');
    await key(fixture, 'p');
    await key(fixture, '1');
    button(fixture, '9').click();
    expect(given.textContent?.trim()).toBe('5');
    expect(given.getAttribute('aria-label')).toBe('Indizio: 5');
    http.expectNone((r) => r.url.startsWith('/api/'));
  });

  it('inserisce/cancella dal keypad e annulla tramite DOM senza chiamare API', async () => {
    const fixture = await page();
    const cell = cells(fixture)[2];
    await click(fixture, cell);
    await click(fixture, button(fixture, '4'));
    expect(cell.textContent?.trim()).toBe('4');
    await click(fixture, button(fixture, 'Cancella'));
    expect(cell.textContent?.trim()).toBe('');
    await click(fixture, button(fixture, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cell.textContent?.trim()).toBe('4');
    http.expectNone((r) => r.url.startsWith('/api/'));
  });

  it('aggiunge e rimuove note, poi ripristina la nota con undo', async () => {
    const fixture = await page();
    const cell = cells(fixture)[10];
    await click(fixture, cell);
    await click(fixture, button(fixture, 'Attiva modalità note'));
    await click(fixture, button(fixture, '7'));
    expect(cell.getAttribute('aria-label')).toContain('note: 7');
    expect(cell.querySelectorAll('.note.active')).toHaveLength(1);
    await click(fixture, button(fixture, '7'));
    expect(cell.querySelector('.cell-notes')).toBeNull();
    await click(fixture, button(fixture, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cell.getAttribute('aria-label')).toContain('note: 7');
    http.expectNone((r) => r.url.startsWith('/api/'));
  });

  it('naviga con frecce e usa note/undo da tastiera', async () => {
    const fixture = await page();
    await click(fixture, cells(fixture)[2]);
    await key(fixture, 'ArrowDown');
    expect(document.activeElement).toBe(cells(fixture)[11]);
    await key(fixture, 'ArrowLeft');
    expect(document.activeElement).toBe(cells(fixture)[10]);
    await key(fixture, 'p');
    await key(fixture, '7');
    expect(cells(fixture)[10].getAttribute('aria-label')).toContain('note: 7');
    await key(fixture, 'z', true);
    expect(cells(fixture)[10].getAttribute('aria-label')).not.toContain('note:');
  });

  it('riprende mosse, note e undo con indice>=10 dopo ricreazione della pagina', async () => {
    const first = await page();
    await click(first, cells(first)[10]);
    await key(first, '7');
    await click(first, cells(first)[11]);
    await key(first, 'p');
    await key(first, '2');
    first.destroy();
    const resumed = await page();
    expect(cells(resumed)[10].textContent?.trim()).toBe('7');
    expect(cells(resumed)[11].getAttribute('aria-label')).toContain('note: 2');
    await click(resumed, button(resumed, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cells(resumed)[11].getAttribute('aria-label')).not.toContain('note:');
    await click(resumed, button(resumed, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cells(resumed)[10].textContent?.trim()).toBe('');
  });

  it.each(['corrotto', 'puzzle diverso', 'indizio alterato', 'finto indizio'])(
    'scarta salvataggio %s e conserva i givens autorevoli',
    async (kind) => {
      const first = await page();
      await click(first, cells(first)[10]);
      await key(first, '7');
      first.destroy();
      const storageKey = `sudoku:board:${daily.puzzleId}`;
      const stored = JSON.parse(localStorage.getItem(storageKey)!);
      if (kind === 'puzzle diverso') stored.puzzleId = 'altro-puzzle';
      if (kind === 'indizio alterato') stored.cells[0].value = 9;
      if (kind === 'finto indizio') stored.cells[10].isGiven = true;
      localStorage.setItem(storageKey, kind === 'corrotto' ? '{' : JSON.stringify(stored));
      const resumed = await page();
      expect(cells(resumed)[0].textContent?.trim()).toBe('5');
      expect(cells(resumed)[10].textContent?.trim()).toBe('');
    },
  );

  it('rimane giocabile se lo Storage rifiuta letture e scritture', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage negato', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    const fixture = await page();
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    expect(cells(fixture)[2].textContent?.trim()).toBe('4');
    await click(fixture, button(fixture, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cells(fixture)[2].textContent?.trim()).toBe('');
  });

  it('risolve la fixture attraverso DOM e vince soltanto dopo HTTP200', async () => {
    const fixture = await page();
    await fill(fixture);
    http.expectNone(finishUrl);
    expect(fixture.nativeElement.textContent).not.toContain('Sudoku completato!');
    const req = finish(fixture);
    expect(req.request.body).toEqual({ board: [...solution] });
    await fixture.whenStable();
    expect(cells(fixture).every((c) => c.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Sudoku completato!');
    button(fixture, 'Verifica').click();
    http.expectNone(finishUrl);
    req.flush(won);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
    expect(fixture.nativeElement.textContent).toContain('2m 20s');
    expect(cells(fixture)).toHaveLength(0);
  });

  it('su422 mantiene la board, permette di correggere e invia la correzione', async () => {
    const fixture = await page();
    await fill(fixture);
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '1');
    finish(fixture).flush({}, { status: 422, statusText: 'Unprocessable Entity' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Controlla i numeri');
    expect(fixture.nativeElement.textContent).not.toContain('Sudoku completato!');
    expect(cells(fixture)[2].textContent?.trim()).toBe('1');
    expect(button(fixture, 'Verifica').disabled).toBe(false);
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    const corrected = finish(fixture);
    expect(corrected.request.body.board).toEqual([...solution]);
    corrected.flush(won);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
  });

  it.each([400, 401, 403, 429, 500, 503])(
    'su HTTP%s rilascia il blocco senza vincere',
    async (status) => {
      const fixture = await page();
      await fill(fixture);
      finish(fixture).flush({}, { status, statusText: 'Error' });
      await fixture.whenStable();
      expect(button(fixture, 'Verifica').disabled).toBe(false);
      expect(cells(fixture).some((c) => c.disabled)).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain('Sudoku completato!');
    },
  );

  it('su409 rilegge EXPIRED e offre la nuova sfida senza altre mosse', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).flush({}, { status: 409, statusText: 'Conflict' });
    http.expectOne(sessionUrl).flush({ ...active, status: 'EXPIRED' });
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(0);
    expect(button(fixture, 'Apri la sfida di oggi')).toBeDefined();
    http.expectNone(finishUrl);
  });

  it('recupera una vittoria409 senza inviare nuovamente il finish', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).flush({}, { status: 409, statusText: 'Conflict' });
    http.expectOne(sessionUrl).flush({ ...active, status: 'WON' });
    http.expectNone(sessionUrl);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
    http.expectNone(finishUrl);
  });

  it('dopo errore rete recupera ACTIVE e invia la board corretta dalla UI', async () => {
    const fixture = await page();
    await fill(fixture);
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '1');
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    http.expectNone(finishUrl);
    expect(button(fixture, 'Riprova verifica')).toBeDefined();
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    button(fixture, 'Riprova verifica').click();
    const recovery = http.expectOne(sessionUrl);
    http.expectNone(finishUrl);
    recovery.flush(active);
    const corrected = http.expectOne(finishUrl);
    expect(corrected.request.body.board).toEqual([...solution]);
    corrected.flush(won);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
  });

  it('dopo risposta persa recupera WON e non duplica il finish', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    http.expectOne(sessionUrl).flush({ ...active, status: 'WON' });
    http.expectNone(sessionUrl);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
    http.expectNone(finishUrl);
  });

  it('conserva il retry se anche il recupero della sessione fallisce', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    // GET retry policy: two extra bounded retries from the real interceptor.
    http.expectOne(sessionUrl).error(new ProgressEvent('offline'));
    for (let attempt = 0; attempt < 2; attempt++) {
      const retry = await vi.waitFor(() => http.expectOne(sessionUrl));
      retry.error(new ProgressEvent('offline'));
    }
    await fixture.whenStable();
    expect(button(fixture, 'Riprova verifica').disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Impossibile recuperare');
    http.expectNone(finishUrl);
  });

  it('alla scadenza server nasconde input e permette di caricare un nuovo giorno', async () => {
    const fixture = await page();
    vi.mocked(Date.now).mockReturnValue(Date.parse(daily.nextResetAt));
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(0);
    button(fixture, 'Apri la sfida di oggi').click();
    const nextDaily = {
      ...daily,
      puzzleId: 'new-day',
      serverDate: '2026-10-25',
      nextResetAt: '2026-10-26T00:00:00+01:00',
    };
    http.expectOne('/api/v1/daily/sudoku').flush(nextDaily);
    http
      .expectOne('/api/v1/daily/sudoku/sessions')
      .flush({ ...active, puzzleId: nextDaily.puzzleId });
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(81);
    expect(fixture.nativeElement.textContent).toContain('25/10/2026');
  });

  it('scarta una cronologia salvata che può alterare un indizio con undo', async () => {
    const first = await page();
    await click(first, cells(first)[10]);
    await key(first, '7');
    first.destroy();
    const storageKey = `sudoku:board:${daily.puzzleId}`;
    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    stored.undoStack.push({ index: 0, prevValue: 9, prevNotes: [] });
    localStorage.setItem(storageKey, JSON.stringify(stored));
    const resumed = await page();
    await click(resumed, button(resumed, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(cells(resumed)[0].textContent?.trim()).toBe('5');
    expect(cells(resumed)[10].textContent?.trim()).toBe('');
  });

  it('recupera WON direttamente senza inventare una durata o richiedere una seconda GET', async () => {
    const fixture = await page({ ...active, status: 'WON' });
    http.expectNone(sessionUrl);
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
    expect(fixture.nativeElement.textContent).toContain('Tempo finale non disponibile');
  });

  it('blocca modifiche e doppio retry anche durante la GET di recupero', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    await fixture.whenStable();
    expect(cells(fixture).every((c) => c.disabled)).toBe(true);
    button(fixture, 'Riprova verifica').click();
    const requests = http.match(sessionUrl);
    expect(requests).toHaveLength(1);
    requests.forEach((r) => r.flush(active));
    http.expectOne(finishUrl).flush(won);
    await fixture.whenStable();
  });

  it('annulla la GET di recupero alla distruzione senza inviare un finish tardivo', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    const request = http.expectOne(sessionUrl);
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    http.expectNone(finishUrl);
  });

  it('mostra un avviso quando il salvataggio non è disponibile', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    const fixture = await page();
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    expect(fixture.nativeElement.textContent).toContain('non verrà salvata');
  });

  it('riprova il caricamento iniziale503 senza spinner permanente', async () => {
    const fixture = await render();
    // The production GET interceptor retries transient statuses twice.
    http.expectOne('/api/v1/daily/sudoku').flush({}, { status: 503, statusText: 'Unavailable' });
    for (let attempt = 0; attempt < 2; attempt++) {
      const retry = await vi.waitFor(() => http.expectOne('/api/v1/daily/sudoku'));
      retry.flush({}, { status: 503, statusText: 'Unavailable' });
    }
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('non è ancora disponibile');
    button(fixture, 'Riprova').click();
    http.expectOne('/api/v1/daily/sudoku').flush(daily);
    http.expectOne('/api/v1/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    http.expectOne('/api/v1/daily/sudoku/sessions').flush(active);
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(81);
  });

  it('permette keypad e clear quando la cella zero è editabile', async () => {
    const fixture = await render();
    http
      .expectOne('/api/v1/daily/sudoku')
      .flush({ ...daily, givens: [0, ...daily.givens.slice(1)] });
    http.expectOne('/api/v1/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    http.expectOne('/api/v1/daily/sudoku/sessions').flush(active);
    await fixture.whenStable();
    await click(fixture, cells(fixture)[0]);
    expect(button(fixture, '5').disabled).toBe(false);
    await click(fixture, button(fixture, '5'));
    expect(cells(fixture)[0].textContent?.trim()).toBe('5');
    await click(fixture, button(fixture, 'Cancella'));
    expect(cells(fixture)[0].textContent?.trim()).toBe('');
  });

  it('mostra Verifica dopo refresh di griglia completa e undo che la ricompleta', async () => {
    const first = await page();
    await fill(first);
    first.destroy();
    const fixture = await page();
    expect(button(fixture, 'Verifica').disabled).toBe(false);
    await click(fixture, cells(fixture)[2]);
    await key(fixture, 'Backspace');
    expect(fixture.nativeElement.querySelector('.verify-cta')).toBeNull();
    await click(fixture, button(fixture, 'Annulla ultima mossa (Ctrl+Z)'));
    expect(button(fixture, 'Verifica').disabled).toBe(false);
    http.expectNone(finishUrl);
  });

  it('rende disponibile la correzione dopo rete, retry422 e un nuovo finish', async () => {
    const fixture = await page();
    await fill(fixture);
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '1');
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    http.expectOne(sessionUrl).flush(active);
    http.expectOne(finishUrl).flush({}, { status: 422, statusText: 'Invalid' });
    await fixture.whenStable();
    expect(button(fixture, 'Verifica').disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Controlla i numeri');
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    const request = finish(fixture);
    expect(request.request.body.board).toEqual([...solution]);
    request.flush(won);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
  });

  it('rilascia il retry dopo503 senza perdere board o possibilità di invio', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    button(fixture, 'Riprova verifica').click();
    http.expectOne(sessionUrl).flush(active);
    http.expectOne(finishUrl).flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(button(fixture, 'Verifica').disabled).toBe(false);
    expect(cells(fixture)[2].textContent?.trim()).toBe('4');
  });

  it('mantiene un recupero raggiungibile se dopo409 la GET fallisce', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).flush({}, { status: 409, statusText: 'Conflict' });
    http.expectOne(sessionUrl).error(new ProgressEvent('offline'));
    for (let attempt = 0; attempt < 2; attempt++) {
      const retry = await vi.waitFor(() => http.expectOne(sessionUrl));
      retry.error(new ProgressEvent('offline'));
    }
    await fixture.whenStable();
    expect(button(fixture, 'Riprova verifica').disabled).toBe(false);
    button(fixture, 'Riprova verifica').click();
    http.expectOne(sessionUrl).flush({ ...active, status: 'EXPIRED' });
    await fixture.whenStable();
    expect(button(fixture, 'Apri la sfida di oggi')).toBeDefined();
    http.expectNone(finishUrl);
  });

  it('ricarica una sola volta se puzzle e sessione cambiano durante apertura', async () => {
    const fixture = await render();
    http.expectOne('/api/v1/daily/sudoku').flush(daily);
    http.expectOne('/api/v1/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    http.expectOne('/api/v1/daily/sudoku/sessions').flush({ ...active, puzzleId: 'nuovo' });
    http.expectOne('/api/v1/daily/sudoku').flush({ ...daily, puzzleId: 'nuovo' });
    http.expectOne('/api/v1/daily/sudoku/sessions').flush({ ...active, puzzleId: 'nuovo' });
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(81);
    http.expectNone('/api/v1/daily/sudoku');
  });

  it('non crea un loop se anche il secondo caricamento è incoerente', async () => {
    const fixture = await render();
    http.expectOne('/api/v1/daily/sudoku').flush(daily);
    http.expectOne('/api/v1/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    http.expectOne('/api/v1/daily/sudoku/sessions').flush({ ...active, puzzleId: 'nuovo' });
    http.expectOne('/api/v1/daily/sudoku').flush(daily);
    http.expectOne('/api/v1/daily/sudoku/sessions').flush({ ...active, puzzleId: 'nuovo' });
    await fixture.whenStable();
    expect(cells(fixture)).toHaveLength(0);
    expect(button(fixture, 'Riprova').disabled).toBe(false);
    http.expectNone('/api/v1/daily/sudoku');
  });

  it('mostra tempo locale indicativo e risultato server zero senza confonderli', async () => {
    const fixture = await page();
    expect(fixture.nativeElement.textContent).toContain('Tempo indicativo di gioco: 10s');
    vi.mocked(Date.now).mockReturnValue(now + 30000);
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tempo indicativo di gioco: 40s');
    await fill(fixture);
    finish(fixture).flush({ ...won, elapsedSeconds: 0 });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Tempo server: 0 secondi');
    expect(fixture.nativeElement.textContent).not.toContain('Tempo finale non disponibile');
  });

  it('Enter riconcilia il finish incerto prima di inviare di nuovo', async () => {
    const fixture = await page();
    await fill(fixture);
    finish(fixture).error(new ProgressEvent('offline'));
    await fixture.whenStable();
    await key(fixture, 'Enter');
    const recovery = http.expectOne(sessionUrl);
    http.expectNone(finishUrl);
    recovery.flush({ ...active, status: 'WON' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Sudoku completato!');
    http.expectNone(finishUrl);
  });

  it('rifiuta finish dopo mezzanotte anche prima del tick periodico', async () => {
    const fixture = await page();
    await fill(fixture);
    vi.mocked(Date.now).mockReturnValue(Date.parse(daily.nextResetAt));
    button(fixture, 'Verifica').click();
    await fixture.whenStable();
    http.expectNone(finishUrl);
    expect(button(fixture, 'Apri la sfida di oggi')).toBeDefined();
  });

  it('resta giocabile anche quando il getter localStorage stesso è vietato', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Accesso negato', 'SecurityError');
    });
    const fixture = await page();
    await click(fixture, cells(fixture)[2]);
    await key(fixture, '4');
    expect(cells(fixture)[2].textContent?.trim()).toBe('4');
    expect(fixture.nativeElement.textContent).toContain('non verrà salvata');
    http.expectNone((r) => r.url.startsWith('/api/'));
  });

  it('rimuove timer e listener quando si lascia la pagina', async () => {
    const clear = vi.spyOn(window, 'clearInterval');
    const remove = vi.spyOn(document, 'removeEventListener');
    const fixture = await page();
    fixture.destroy();
    expect(clear).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
