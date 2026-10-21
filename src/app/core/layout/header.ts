import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navigation } from './navigation';

@Component({
  selector: 'app-header',
  imports: [RouterLink, Navigation],
  template: `<header>
    <div class="container header-content">
      <a routerLink="/" class="brand" aria-label="Pausa5, pagina iniziale"
        >Pausa5<span>Una pausa, una sfida.</span></a
      >
      <app-navigation />
    </div>
  </header>`,
  styles: `
    header {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }
    .header-content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-block: var(--space-4);
    }
    .brand {
      display: inline-flex;
      flex-direction: column;
      min-height: var(--touch-target);
      font-size: 1.6rem;
      font-weight: 750;
      text-decoration: none;
    }
    .brand span {
      font-size: var(--text-sm);
      color: var(--color-muted);
      font-weight: 400;
    }
    app-navigation {
      min-width: 0;
    }
  `,
})
export class Header {}
