import { Component, input } from '@angular/core';
import { Card } from './card';

@Component({
  selector: 'app-empty-state',
  imports: [Card],
  template: `<app-card
    ><section>
      <span class="symbol" aria-hidden="true">✳</span>
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
      <ng-content /></section
  ></app-card>`,
  styles: `
    section {
      padding: clamp(1.5rem, 4vw, 3rem);
      overflow-wrap: anywhere;
    }
    .symbol {
      display: block;
      font-size: 2.5rem;
      line-height: 1;
      color: var(--color-accent);
      margin-bottom: 1.5rem;
    }
    h2 {
      margin-top: 0;
    }
  `,
})
export class EmptyState {
  readonly heading = input('Nessun contenuto disponibile');
  readonly message = input('Qui non ci sono ancora elementi da mostrare.');
}
