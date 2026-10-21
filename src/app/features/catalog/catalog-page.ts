import { Component } from '@angular/core';
import { GameTile } from '../../shared/ui/game-tile';

@Component({
  selector: 'app-catalog-page',
  imports: [GameTile],
  template: `
    <h1>Tutti i giochi</h1>
    <p>Scopri le sfide di Pausa5. Le partite saranno disponibili prossimamente.</p>
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
        route="/sudoku-del-giorno"
        mode="Sfida quotidiana"
        description="La stessa griglia per tutti, con una nuova sfida ogni giorno."
      />
      <app-game-tile
        title="Sudoku online"
        route="/sudoku-online"
        mode="Illimitato"
        description="Riempi la griglia con i numeri da uno a nove, senza ripetizioni."
      />
      <app-game-tile
        title="2048"
        route="/2048"
        mode="Illimitato"
        description="Unisci le tessere uguali e prova a raggiungere il numero 2048."
      />
    </div>
  `,
})
export class CatalogPage {}
