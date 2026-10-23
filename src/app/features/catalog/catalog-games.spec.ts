import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CatalogGames } from './catalog-games';
import { HomePage } from './home-page';
import { CatalogPage } from './catalog-page';

const word = {
  slug: 'word',
  title: 'Parola segreta',
  category: 'parole',
  modes: ['DAILY', 'ENDLESS'],
  enabled: true,
};
const seeded = {
  games: [
    word,
    {
      slug: 'sudoku',
      title: 'Sudoku',
      category: 'logica',
      modes: ['DAILY', 'ENDLESS'],
      enabled: true,
    },
    { slug: '2048', title: '2048', category: 'logica', modes: ['ENDLESS'], enabled: true },
  ],
};

describe('Catalogo dinamico con fallback statico', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [CatalogGames, HomePage, CatalogPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function page() {
    const fixture = TestBed.createComponent(CatalogGames);
    fixture.detectChanges();
    await fixture.whenStable();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/games');
    return { fixture, request };
  }

  it('prepara il fallback senza rete e lascia le card visibili durante il caricamento', async () => {
    const fixture = TestBed.createComponent(CatalogGames);
    expect(fixture.componentInstance.catalog.state()).toBe('static');
    expect(fixture.componentInstance.catalog.cards()).toHaveLength(3);
    TestBed.inject(HttpTestingController).expectNone('/api/v1/games');
    fixture.detectChanges();
    await fixture.whenStable();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/games');
    expect(request.request.method).toBe('GET');
    expect(request.request.transferCache).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(3);
    expect(fixture.nativeElement.textContent).toContain('Aggiorniamo');
    request.flush(seeded);
  });

  it('mostra solo le modalità implementate con link canonici e gruppi quotidiano/illimitato', async () => {
    const { fixture, request } = await page();
    request.flush(seeded);
    fixture.detectChanges();
    const links = [
      ...fixture.nativeElement.querySelectorAll('app-game-tile a'),
    ] as HTMLAnchorElement[];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/parola-del-giorno',
      '/sudoku-del-giorno',
      '/parole-illimitate',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Sfide di oggi');
    expect(fixture.nativeElement.textContent).toContain('Gioca senza limiti');
    expect(fixture.nativeElement.textContent).not.toContain('Prossimamente');
    expect(fixture.nativeElement.querySelectorAll('.availability')[0].textContent).toContain(
      'Disponibile',
    );
  });

  it('rispetta modalità disattivate e non mantiene card rimosse dalla risposta', async () => {
    const { fixture, request } = await page();
    request.flush({ games: [{ ...word, modes: ['ENDLESS'] }] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/parola-del-giorno"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/parole-illimitate"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#catalog-DAILY')).toBeNull();
  });

  it.each([{ games: [] }, { games: [{ ...word, enabled: false }] }])(
    'rende il catalogo vuoto senza ripristinare giochi nascosti: %j',
    async (payload) => {
      const { fixture, request } = await page();
      request.flush(payload);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(0);
      expect(fixture.nativeElement.textContent).toContain('Nessun gioco disponibile');
      expect(fixture.nativeElement.querySelector('a[href="/come-si-gioca"]')).toBeTruthy();
    },
  );

  it("spiega l'errore di rete, mantiene il fallback e consente un retry senza richieste duplicate", async () => {
    const { fixture, request } = await page();
    request.error(new ProgressEvent('network'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Non riusciamo a verificare');
    expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.availability').textContent).toContain(
      'Da verificare',
    );
    fixture.nativeElement.querySelector('app-error-state button').click();
    fixture.componentInstance.catalog.load();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/games').flush(seeded);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('.availability').textContent).toContain(
      'Disponibile',
    );
  });

  it('una risposta malformata non blocca la pagina né inventa disponibilità confermate', async () => {
    const { fixture, request } = await page();
    request.flush({ games: [{ ...word, modes: 'DAILY' }] });
    fixture.detectChanges();
    expect(fixture.componentInstance.catalog.state()).toBe('error');
    expect(fixture.nativeElement.querySelector('.availability').textContent).toContain(
      'Da verificare',
    );
  });

  it('ignora giochi futuri e deduplica le modalità senza creare rotte arbitrarie', async () => {
    const { fixture, request } = await page();
    request.flush({
      games: [
        { slug: 'nesso', title: 'Nesso', modes: ['DAILY'], enabled: true },
        { ...word, modes: ['DAILY', 'DAILY'] },
      ],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('a[href="/parola-del-giorno"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Nesso');
  });

  it('un errore successivo non riabilita un gioco che il backend aveva disattivato', async () => {
    const { fixture, request } = await page();
    request.flush({ games: [] });
    fixture.componentInstance.catalog.load();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/games')
      .error(new ProgressEvent('network'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(0);
  });

  it.each([HomePage, CatalogPage])(
    'carica il catalogo su ingresso diretto e ricreazione della pagina %s',
    async (component) => {
      for (let iteration = 0; iteration < 2; iteration++) {
        const fixture = TestBed.createComponent(component);
        fixture.detectChanges();
        await fixture.whenStable();
        TestBed.inject(HttpTestingController).expectOne('/api/v1/games').flush(seeded);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('app-game-tile')).toHaveLength(3);
        fixture.destroy();
      }
    },
  );
});
