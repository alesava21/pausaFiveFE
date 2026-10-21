import { Component } from '@angular/core';
import { CatalogGames } from './catalog-games';

@Component({
  selector: 'app-catalog-page',
  imports: [CatalogGames],
  template: `
    <header class="page-intro">
      <p class="eyebrow">La tua prossima pausa</p>
      <h1>Tutti i giochi</h1>
      <p>Parole da scoprire, numeri da incastrare. Scegli la sfida che fa per te.</p>
      <p>Una sfida quotidiana o una partita senza limiti: trova il tuo ritmo.</p>
    </header>
    <app-catalog-games />
  `,
})
export class CatalogPage {}
