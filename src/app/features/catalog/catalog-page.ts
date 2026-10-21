import { Component } from '@angular/core';
import { GameTile } from '../../shared/ui/game-tile';

@Component({
  selector: 'app-catalog-page',
  imports: [GameTile],
  template: `
    <header class="page-intro">
      <p class="eyebrow">La tua prossima pausa</p>
      <h1>Tutti i giochi</h1>
      <p>Parole da scoprire, numeri da incastrare. Scegli la sfida che fa per te.</p>
      <p>Stiamo preparando le prime partite: tutti i giochi saranno disponibili prossimamente.</p>
    </header>
    <div class="game-grid">
      <app-game-tile
        title="Parola del giorno"
        route="/parola-del-giorno"
        mode="Sfida quotidiana"
        description="Una parola italiana di cinque lettere, sei tentativi e una nuova sfida ogni giorno."
      />
      <app-game-tile
        title="Parole illimitate"
        route="/parole-illimitate"
        mode="Illimitato"
        description="Allenati con le parole: una nuova sfida ogni volta che vuoi."
      />
      <app-game-tile
        title="Sudoku del giorno"
        artwork="sudoku"
        route="/sudoku-del-giorno"
        mode="Sfida quotidiana"
        description="La stessa griglia per tutti, con una nuova sfida ogni giorno."
      />
      <app-game-tile
        title="Sudoku online"
        artwork="sudoku"
        route="/sudoku-online"
        mode="Illimitato"
        description="Riempi la griglia con i numeri da uno a nove, senza ripetizioni."
      />
      <app-game-tile
        title="2048"
        artwork="merge"
        route="/2048"
        mode="Illimitato"
        description="Unisci le tessere uguali e prova a raggiungere il numero 2048."
      />
    </div>
  `,
})
export class CatalogPage {}
