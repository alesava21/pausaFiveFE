import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { PageTitleStrategy } from './core/routing/page-title-strategy';

const pages = [
  ['/', 'Giochi gratis, ogni giorno'],
  ['/giochi', 'Tutti i giochi'],
  ['/parola-del-giorno', 'Parola del giorno'],
  ['/parole-illimitate', 'Parole illimitate'],
  ['/sudoku-online', 'Sudoku online gratis'],
  ['/sudoku-del-giorno', 'Sudoku del giorno'],
  ['/2048', 'Gioca a 2048'],
  ['/come-si-gioca', 'Come si gioca'],
  ['/privacy', 'Privacy'],
  ['/cookie-policy', 'Cookie'],
  ['/contatti', 'Contatti'],
  ['/404', 'Pagina non trovata'],
];

describe('Rotte M1', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes, withComponentInputBinding()),
        { provide: TitleStrategy, useClass: PageTitleStrategy },
      ],
    }),
  );

  it.each(pages)('%s ha contenuto e metadati in italiano', async (path, heading) => {
    const harness = await RouterTestingHarness.create(path);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
    expect(TestBed.inject(Title).getTitle()).toBe(`${heading} | Pausa5`);
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBeTruthy();
  });

  it.each([1, 2, 3, 4, 5, 6])(
    'apre l’anteprima %i senza chiamate al backend e con noindex',
    async (variant) => {
      const harness = await RouterTestingHarness.create(`/anteprime/parola/${variant}`);
      expect(
        harness.routeNativeElement?.querySelector(variant === 1 ? '.v1' : `.m${variant}`),
      ).toBeTruthy();
      expect(harness.routeNativeElement?.querySelectorAll('.design-picker a')).toHaveLength(6);
      expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    },
  );

  it('gestisce URL sconosciuti e rimuove noindex tornando a una pagina pubblica', async () => {
    const harness = await RouterTestingHarness.create('/non-esiste');
    expect(TestBed.inject(Router).url).toBe('/404');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    await harness.navigateByUrl('/parola-del-giorno');
    expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();
    await harness.navigateByUrl('/parole-illimitate');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Parole illimitate');
  });
  it('passa da endless a daily senza trasportare sessione o soluzione della partita illimitata', async () => {
    const harness = await RouterTestingHarness.create('/parole-illimitate');
    const http = TestBed.inject(HttpTestingController);
    const state = {
      puzzleId: 'puzzle-endless',
      mode: 'ENDLESS',
      status: 'WON',
      sessionId: 'endless-session',
      attempts: [],
      remainingAttempts: 5,
      serverDate: '2026-10-22',
      nextResetAt: new Date(Date.now() + 86400_000).toISOString(),
      solution: 'GATTO',
    };
    const endless = http.expectOne('/api/v1/endless/word/sessions');
    expect(endless.request.body).toEqual({ newGame: false });
    endless.flush(state);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('GATTO');
    await harness.navigateByUrl('/parola-del-giorno');
    const daily = http.expectOne('/api/v1/daily/word/sessions');
    expect(daily.request.body).toEqual({});
    daily.flush({
      ...state,
      solution: undefined,
      mode: 'DAILY',
      sessionId: 'daily-session',
      status: 'ACTIVE',
      remainingAttempts: 6,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('GATTO');
    expect(harness.routeNativeElement?.querySelector('#word-guess')).not.toBeNull();
    expect(
      harness.routeNativeElement?.querySelector('a[href="/parole-illimitate"]'),
    ).not.toBeNull();
    http.verify();
  });
});
