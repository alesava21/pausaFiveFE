import { Component, afterNextRender, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { GameTile } from '../../shared/ui/game-tile';
import { Loading } from '../../shared/ui/loading';
import { CatalogService } from './catalog.service';

@Component({
  selector: 'app-catalog-games',
  imports: [RouterLink, GameTile, Loading, EmptyState, ErrorState],
  providers: [CatalogService],
  template: `
    @if (catalog.state() === 'loading') {
      <app-loading message="Aggiorniamo i giochi disponibili…" />
    } @else if (catalog.state() === 'error') {
      <app-error-state
        message="Non riusciamo a verificare la disponibilità dei giochi. Puoi consultare le informazioni qui sotto oppure riprovare."
        (retry)="catalog.load()"
      />
    }
    @if (catalog.state() === 'static') {
      <p class="catalog-note">
        Consulta le sfide di parole. La disponibilità viene verificata quando apri la pagina.
      </p>
    }
    @if (catalog.state() === 'ready' && catalog.cards().length === 0) {
      <app-empty-state
        heading="Nessun gioco disponibile al momento"
        message="Le sfide torneranno qui appena saranno disponibili. Riprova più tardi."
        ><a routerLink="/come-si-gioca">Scopri come si gioca</a></app-empty-state
      >
    }
    @for (section of sections; track section.mode) {
      @let cards = catalog.cards().filter(section.filter);
      @if (cards.length) {
        <section
          [attr.aria-labelledby]="'catalog-' + section.mode"
          [attr.aria-busy]="catalog.state() === 'loading'"
        >
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ section.eyebrow }}</p>
              <h2 [id]="'catalog-' + section.mode">{{ section.title }}</h2>
            </div>
            @if (home() && section.mode === 'DAILY') {
              <a routerLink="/giochi" class="all-games"
                >Tutti i giochi <span aria-hidden="true">↗</span></a
              >
            }
          </div>
          <p class="section-description">{{ section.description }}</p>
          <div class="game-grid">
            @for (card of cards; track card.route) {
              <app-game-tile
                [title]="card.title"
                [route]="card.route"
                [description]="card.description"
                [mode]="section.mode === 'DAILY' ? 'Sfida quotidiana' : 'Illimitato'"
                [available]="true"
                [verified]="catalog.state() === 'ready'"
              />
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      margin-top: 2.5rem;
    }
    .section-heading {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
    }
    .section-heading .eyebrow {
      margin-bottom: 0.75rem;
    }
    h2 {
      font-size: clamp(1.8rem, 4vw, 2.5rem);
      letter-spacing: -0.035em;
      margin: 0;
    }
    .all-games {
      display: inline-flex;
      gap: 1rem;
      align-items: center;
      min-height: 2.75rem;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .section-description,
    .catalog-note {
      color: var(--color-muted);
    }
    .catalog-note {
      font-size: 0.8rem;
    }
    .game-grid {
      margin-top: 1.5rem;
    }
    app-error-state,
    app-empty-state {
      display: block;
      margin-top: 1.5rem;
    }
  `,
})
export class CatalogGames {
  readonly home = input(false);
  readonly catalog = inject(CatalogService);
  readonly sections = [
    {
      mode: 'DAILY',
      title: 'Sfide di oggi',
      eyebrow: 'Una pausa, ogni giorno',
      description: 'La stessa sfida per tutti. Una nuova occasione ogni giorno.',
      filter: (card: { mode: string }) => card.mode === 'DAILY',
    },
    {
      mode: 'ENDLESS',
      title: 'Gioca senza limiti',
      eyebrow: 'Al tuo ritmo',
      description: 'Allenati quanto vuoi e inizia una nuova partita quando sei pronto.',
      filter: (card: { mode: string }) => card.mode === 'ENDLESS',
    },
  ];

  constructor() {
    afterNextRender(() => this.catalog.load());
  }
}
