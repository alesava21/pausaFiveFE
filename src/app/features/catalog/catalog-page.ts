import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-catalog-page',
  imports: [RouterLink],
  template: `
    <h1>Tutti i giochi</h1>
    <p>Scopri le sfide di Pausa5. Le partite saranno disponibili prossimamente.</p>
    <ul>
      <li><a routerLink="/parola-del-giorno">Parola del giorno</a></li>
      <li><a routerLink="/parole-illimitate">Parole illimitate</a></li>
      <li><a routerLink="/sudoku-del-giorno">Sudoku del giorno</a></li>
      <li><a routerLink="/sudoku-online">Sudoku online</a></li>
      <li><a routerLink="/2048">2048</a></li>
    </ul>
  `,
})
export class CatalogPage {}
