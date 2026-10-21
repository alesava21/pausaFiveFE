import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-card',
  imports: [MatCardModule],
  template: `<mat-card appearance="outlined" class="card"><ng-content /></mat-card>`,
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
      overflow: hidden;
      box-shadow: var(--shadow-card);
    }
  `,
})
export class Card {}
