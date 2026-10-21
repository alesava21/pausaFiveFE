import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `<div role="status" aria-busy="true">
    <span class="spinner" aria-hidden="true"></span><span>{{ message() }}</span>
  </div>`,
  styles: `
    div {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-block: var(--space-4);
      overflow-wrap: anywhere;
    }
    .spinner {
      flex: 0 0 1.25rem;
      height: 1.25rem;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `,
})
export class Loading {
  readonly message = input('Caricamento in corso…');
}
