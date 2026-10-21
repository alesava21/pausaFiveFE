import { Component } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `<div class="card"><ng-content /></div>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
      height: 100%;
    }
    .card {
      height: 100%;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      overflow-wrap: anywhere;
    }
  `,
})
export class Card {}
