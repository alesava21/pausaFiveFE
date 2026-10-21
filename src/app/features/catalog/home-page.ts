import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <h1>Giochi gratis, ogni giorno</h1>
    <p>Una pausa tra parole, numeri e logica: scopri Parola segreta, Sudoku e 2048.</p>
    <p>Sfide quotidiane e giochi illimitati, direttamente dal browser.</p>
    <a routerLink="/giochi">Scopri tutti i giochi</a>
  `,
})
export class HomePage {}
