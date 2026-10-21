import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from './card';
import { GameArtwork } from './game-artwork';

@Component({
  selector: 'app-game-tile',
  imports: [RouterLink, Card, GameArtwork],
  template: `
    <app-card>
      <a [routerLink]="route()" class="tile">
        <app-game-artwork [kind]="artwork()" />
        <div class="tile-content">
          <span class="mode">{{ mode() }}</span>
          <h2>{{ title() }}</h2>
          <p>{{ description() }}</p>
          <div class="tile-bottom">
            <span class="availability">Prossimamente</span>
            <span class="link-hint"
              >Scopri <span class="sr-only">il gioco {{ title() }}</span
              ><span aria-hidden="true">↗</span></span
            >
          </div>
        </div>
      </a>
    </app-card>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .tile {
      display: flex;
      flex-direction: column;
      height: 100%;
      color: var(--color-text);
      text-decoration: none;
      border-radius: var(--radius-lg);
    }
    .tile:hover .link-hint {
      text-decoration: underline;
    }
    app-game-artwork {
      width: 100%;
    }
    .tile-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: var(--space-6);
    }
    .tile-bottom {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: auto;
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-soft);
    }
    h2 {
      color: var(--color-primary);
      margin-block: var(--space-2);
    }
    p {
      margin-block: var(--space-2) var(--space-6);
    }
    .link-hint {
      color: var(--color-primary);
      font-size: var(--text-sm);
      font-weight: 700;
      display: flex;
      gap: 0.5rem;
    }
    .mode {
      font-size: var(--text-sm);
      color: var(--color-muted);
      font-weight: 650;
    }
    .availability {
      font-size: var(--text-sm);
      font-weight: 650;
      background: var(--color-soft);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-sm);
    }
  `,
})
export class GameTile {
  readonly artwork = input<'word' | 'sudoku' | 'merge'>('word');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly route = input.required<string>();
  readonly mode = input('');
}
