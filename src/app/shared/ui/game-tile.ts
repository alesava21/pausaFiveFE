import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from './card';

@Component({
  selector: 'app-game-tile',
  imports: [RouterLink, Card],
  template: `
    <app-card>
      <a [routerLink]="route()" class="tile">
        <span class="mode">{{ mode() }}</span>
        <h2>{{ title() }}</h2>
        <p>{{ description() }}</p>
        <span class="availability">Prossimamente</span>
        <span class="link-hint">Scopri il gioco <span aria-hidden="true">→</span></span>
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
      align-items: flex-start;
      height: 100%;
      padding: var(--space-6);
      color: var(--color-text);
      text-decoration: none;
      border-radius: var(--radius-lg);
    }
    .tile:hover {
      background: var(--color-soft);
    }
    h2 {
      color: var(--color-primary);
      margin-block: var(--space-2);
    }
    p {
      margin-block: var(--space-2) var(--space-6);
    }
    .link-hint {
      margin-top: var(--space-3);
      color: var(--color-primary);
      text-decoration: underline;
    }
    .mode {
      font-size: var(--text-sm);
      color: var(--color-muted);
    }
    .availability {
      margin-top: auto;
      font-size: var(--text-sm);
      font-weight: 650;
      border: 1px solid var(--color-border);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-sm);
    }
  `,
})
export class GameTile {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly route = input.required<string>();
  readonly mode = input('');
}
