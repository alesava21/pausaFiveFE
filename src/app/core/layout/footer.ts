import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `<footer>
    <div class="container footer-content">
      <div class="footer-brand">
        <a routerLink="/" aria-label="Pausa5, pagina iniziale">pausa<span>5</span></a>
        <p>Una pausa di parole, numeri e logica.</p>
      </div>
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
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      padding-block: var(--space-8);
      padding-bottom: max(var(--space-6), env(safe-area-inset-bottom));
    }
    .footer-content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem 2rem;
    }
    .footer-brand > a {
      font-weight: 800;
      font-size: 1.6rem;
      text-decoration: none;
      letter-spacing: -0.06em;
    }
    .footer-brand > a span {
      color: var(--color-accent);
    }
    .footer-brand p {
      margin-block: 0.25rem;
      color: var(--color-muted);
      font-size: 0.8rem;
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
      flex-basis: 100%;
      max-width: none;
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-4);
      margin-bottom: 0;
    }
  `,
})
export class Footer {}
