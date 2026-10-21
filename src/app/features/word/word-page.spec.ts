import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WordSessionDto } from '../../core/api/api-contracts';
import { ApiError } from '../../core/api/api-error';
import { WordClient } from './word-client';
import { WordPage } from './word-page';
import { throwError } from 'rxjs';

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
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [WordPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function page(mode: 'DAILY' | 'ENDLESS' = 'DAILY') {
    const fixture = TestBed.createComponent(WordPage);
    fixture.componentRef.setInput('heading', 'Parola segreta');
    fixture.componentRef.setInput('description', 'Indovina la parola.');
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/v1/${mode === 'DAILY' ? 'daily' : 'endless'}/word/sessions`)
      .flush({ ...active, mode });
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

  it('scrive nella riga attiva con tastiera a schermo e cancella senza inviare', async () => {
    const fixture = await page();
    const keys = [...fixture.nativeElement.querySelectorAll('.key')] as HTMLButtonElement[];
    for (const letter of 'GATTO') keys.find((key) => key.textContent?.trim() === letter)!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.guess).toBe('GATTO');
    const row = fixture.nativeElement.querySelector('.word-row.current');
    expect(
      [...row.querySelectorAll('.tile')]
        .map((tile) => (tile as HTMLElement).textContent?.trim())
        .join(''),
    ).toBe('GATTO');
    keys.find((key) => key.textContent?.trim() === '⌫')!.click();
    expect(fixture.componentInstance.guess).toBe('GATT');
    TestBed.inject(HttpTestingController).expectNone((request) => request.url.endsWith('/guesses'));
  });

  it('accetta la tastiera fisica nella riga e invia con Invio', async () => {
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
    expect(nextInput).not.toBe(input);
    expect(document.activeElement).toBe(nextInput);
    nextInput.value = 'treno';
    nextInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.guess).toBe('treno');
  });

  it('conserva il miglior indizio di una lettera ripetuta sulla tastiera', async () => {
    const fixture = await page();
    const component = fixture.componentInstance;
    component.game.set({
      ...active,
      attempts: [
        { guess: 'GATTO', evaluation: ['ABSENT', 'PRESENT', 'CORRECT', 'ABSENT', 'ABSENT'] },
      ],
      remainingAttempts: 5,
    });
    fixture.detectChanges();
    expect(component.keyState('T')).toBe('CORRECT');
    expect(component.keyState('A')).toBe('PRESENT');
    expect(component.keyState('Z')).toBeUndefined();
    component.pending.set({ guess: 'LIBRO', key: 'pending-key' });
    component.typeKey('A');
    expect(component.guess).toBe('');
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
});
