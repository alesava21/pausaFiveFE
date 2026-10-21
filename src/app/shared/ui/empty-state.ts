import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `<section>
    <h2>{{ heading() }}</h2>
    <p>{{ message() }}</p>
    <ng-content />
  </section>`,
  styles: `
    section {
      padding: var(--space-6);
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      overflow-wrap: anywhere;
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
