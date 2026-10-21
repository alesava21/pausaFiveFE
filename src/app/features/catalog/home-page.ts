import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { GameArtwork } from '../../shared/ui/game-artwork';
import { CatalogGames } from './catalog-games';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, MatButtonModule, GameArtwork, CatalogGames],
  template: `
    <section class="hero" aria-labelledby="home-heading">
      <div class="hero-copy">
        <p class="eyebrow">Piccole sfide, belle pause</p>
        <h1 id="home-heading">Giochi gratis, ogni giorno</h1>
        <p class="hero-description">Lascia fuori la fretta.<br />Fai spazio a una buona idea.</p>
        <p class="hero-detail">
          Parole, numeri e logica. Un piccolo momento per te, una sfida alla volta.
        </p>
        <a matButton="filled" [disableRipple]="true" routerLink="/giochi" class="hero-action">
          Scopri tutti i giochi <span aria-hidden="true">↗</span>
        </a>
        <p class="hero-note">Senza account. Con tutto il tempo che vuoi.</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
        <span class="art-caption">La mente gioca. Tu respiri.</span>
        <div class="floating word-preview"><app-game-artwork kind="word" /></div>
        <div class="floating sudoku-preview"><app-game-artwork kind="sudoku" /></div>
        <div class="floating merge-preview"><app-game-artwork kind="merge" /></div>
        <span class="star">✳</span>
        <span class="pause-note">Una pausa ti fa bene.</span>
      </div>
    </section>
    <div class="manifesto">
      <span>Il tuo ritmo. La tua pausa.</span>
      <span
        >Parole <span aria-hidden="true">✳</span> Numeri
        <span aria-hidden="true">✳</span> Logica</span
      >
    </div>
    <app-catalog-games [home]="true" />
    <aside class="closing-note">
      <span class="closing-symbol" aria-hidden="true">✳</span>
      <div>
        <h2>Ogni tanto, prenditi cinque.</h2>
        <p>Non serve andare lontano per cambiare prospettiva. A volte basta una piccola sfida.</p>
      </div>
      <a matButton="outlined" [disableRipple]="true" routerLink="/come-si-gioca">Come si gioca</a>
    </aside>
  `,
  styleUrl: './home-page.css',
})
export class HomePage {}
