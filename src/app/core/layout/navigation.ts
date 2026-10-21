import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navigazione principale">
      <a routerLink="/giochi" routerLinkActive="active" ariaCurrentWhenActive="page"
        >Tutti i giochi</a
      >
      <a routerLink="/come-si-gioca" routerLinkActive="active" ariaCurrentWhenActive="page"
        >Come si gioca</a
      >
    </nav>
  `,
  styles: `
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
    }
    a:hover,
    a.active {
      background: var(--color-soft);
    }
    a.active {
      text-decoration: underline;
      text-underline-offset: 0.3em;
      font-weight: 650;
    }
  `,
})
export class Navigation {}
