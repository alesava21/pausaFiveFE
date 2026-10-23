import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GamesDto, GameMode, GameSlug } from '../../core/api/api-contracts';

interface GameCard {
  readonly slug: GameSlug;
  readonly mode: GameMode;
  readonly title: string;
  readonly route: string;
  readonly description: string;
}

// Abilitare una voce soltanto quando esiste il gameplay della relativa rotta.
const playableCards: readonly GameCard[] = [
  {
    slug: 'word',
    mode: 'DAILY',
    title: 'Parola del giorno',
    route: '/parola-del-giorno',
    description:
      'Cinque lettere, sei tentativi e una nuova parola italiana da scoprire ogni giorno.',
  },
  {
    slug: 'word',
    mode: 'ENDLESS',
    title: 'Parole illimitate',
    route: '/parole-illimitate',
    description: 'Segui gli indizi e allenati con una nuova parola ogni volta che vuoi.',
  },
  {
    slug: 'sudoku',
    mode: 'DAILY',
    title: 'Sudoku del giorno',
    route: '/sudoku-del-giorno',
    description: 'Una nuova griglia 9×9 ogni giorno, con gli stessi indizi per tutti.',
  },
];
const staticCatalog: GamesDto['games'] = [
  {
    slug: 'word',
    title: 'Parola segreta',
    category: 'parole',
    modes: ['DAILY', 'ENDLESS'],
    enabled: true,
  },
  {
    slug: 'sudoku',
    title: 'Sudoku',
    category: 'logica',
    modes: ['DAILY', 'ENDLESS'],
    enabled: true,
  },
];

function parseCatalog(payload: unknown): GamesDto['games'] {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('games' in payload) ||
    !Array.isArray(payload.games)
  )
    throw new Error('Catalogo non valido');
  const games: GamesDto['games'][number][] = [];
  const seen = new Set<string>();
  for (const value of payload.games as unknown[]) {
    if (!value || typeof value !== 'object' || !('slug' in value) || typeof value.slug !== 'string')
      throw new Error('Gioco non valido');
    // Un futuro slug non deve creare link o impedire la lettura dei giochi M1.
    if (!['word', 'sudoku', '2048'].includes(value.slug)) continue;
    if (
      seen.has(value.slug) ||
      !('title' in value) ||
      typeof value.title !== 'string' ||
      !('category' in value) ||
      (value.category !== 'parole' && value.category !== 'logica') ||
      !('enabled' in value) ||
      typeof value.enabled !== 'boolean' ||
      !('modes' in value) ||
      !Array.isArray(value.modes) ||
      !value.modes.every((mode: unknown) => mode === 'DAILY' || mode === 'ENDLESS')
    )
      throw new Error('Metadati catalogo non validi');
    seen.add(value.slug);
    games.push({
      slug: value.slug as GameSlug,
      title: value.title,
      category: value.category as 'parole' | 'logica',
      enabled: value.enabled,
      modes: [...new Set(value.modes)] as GameMode[],
    });
  }
  return games;
}

@Injectable()
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);
  private readonly games = signal<GamesDto['games']>(staticCatalog);
  readonly state = signal<'static' | 'loading' | 'ready' | 'error'>('static');
  readonly cards = computed(() =>
    this.games()
      .filter((game) => game.enabled)
      .flatMap((game) =>
        playableCards.filter((card) => card.slug === game.slug && game.modes.includes(card.mode)),
      ),
  );

  load(): void {
    if (this.state() === 'loading') return;
    this.state.set('loading');
    this.http
      .get<unknown>('/api/v1/games', { transferCache: false })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (payload) => {
          try {
            this.games.set(parseCatalog(payload));
            this.state.set('ready');
          } catch {
            this.state.set('error');
          }
        },
        error: () => this.state.set('error'),
      });
  }
}
