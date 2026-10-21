import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navigation } from './navigation';

@Component({
  selector: 'app-header',
  imports: [RouterLink, Navigation],
  template: `<header>
    <div class="container header-content">
      <a routerLink="/" class="brand" aria-label="Pausa5, pagina iniziale">
        <span class="brand-mark" aria-hidden="true">5<span class="dot"></span></span>
        <span class="brand-name">pausa<span>5</span><small>Una pausa, una sfida.</small></span>
      </a>
      <app-navigation />
    </div>
  </header>`,
  styles: `
    header {
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
    }
    .header-content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding-block: var(--space-6);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      min-height: var(--touch-target);
      font-size: 1.75rem;
      font-weight: 750;
      text-decoration: none;
    }
    .brand-mark {
      display: inline-grid;
      place-items: center;
      position: relative;
      width: 2.9rem;
      height: 2.9rem;
      border-radius: 0.9rem;
      background: var(--color-primary);
      color: white;
      font-size: 2rem;
      line-height: 1;
      transform: rotate(-6deg);
    }
    .dot {
      position: absolute;
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: #e9c96a;
      right: 0.4rem;
      bottom: 0.4rem;
    }
    .brand-name {
      line-height: 1.2;
      letter-spacing: -0.06em;
    }
    .brand-name > span {
      color: var(--color-accent);
    }
    small {
      display: block;
      font-size: 0.65rem;
      letter-spacing: 0.02em;
      color: var(--color-muted);
      font-weight: 400;
    }
    app-navigation {
      min-width: 0;
    }
    @media (max-width: 29rem) {
      .header-content {
        gap: 1rem;
        padding-block: 1rem;
      }
      app-navigation {
        width: 100%;
      }
    }
  `,
})
export class Header {}
