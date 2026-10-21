import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

  it('gestisce URL sconosciuti e rimuove noindex tornando a una pagina pubblica', async () => {
    const harness = await RouterTestingHarness.create('/non-esiste');
    expect(TestBed.inject(Router).url).toBe('/404');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toContain('noindex');
    await harness.navigateByUrl('/parola-del-giorno');
    expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();
    await harness.navigateByUrl('/parole-illimitate');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Parole illimitate');
  });
});
