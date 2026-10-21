import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `<footer>
    <div class="container">
      <p>Una pausa di parole, numeri e logica.</p>
      <nav aria-label="Informazioni">
        <a routerLink="/privacy">Privacy</a><a routerLink="/cookie-policy">Cookie</a
        ><a routerLink="/contatti">Contatti</a>
      </nav>
      <p class="note">
        Sito in preparazione: informative e contatti non sono ancora pronti per il lancio pubblico.
      </p>
    </div>
  </footer>`,
  styles: `
    footer {
      border-top: 1px solid var(--color-border);
      padding-block: var(--space-6);
      padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    nav a {
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
    }
    .note {
      color: var(--color-muted);
      font-size: var(--text-sm);
    }
  `,
})
export class Footer {}
