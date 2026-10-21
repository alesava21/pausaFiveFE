import { Component, input } from '@angular/core';

/** Illustrazioni decorative originali: non rappresentano una partita attiva. */
@Component({
  selector: 'app-game-artwork',
  template: `
    <div class="artwork" [class]="'artwork ' + kind()" aria-hidden="true">
      @switch (kind()) {
        @case ('word') {
          <div class="letter-row">
            @for (letter of letters; track $index) {
              <span>{{ letter }}</span>
            }
          </div>
          <div class="letter-row ghost">
            @for (letter of letters; track $index) {
              <span></span>
            }
          </div>
        }
        @case ('sudoku') {
          <div class="number-grid">
            @for (number of sudoku; track $index) {
              <span>{{ number }}</span>
            }
          </div>
        }
        @case ('merge') {
          <div class="merge-grid"><span>2</span><span>4</span><span>8</span><span>16</span></div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      container-type: inline-size;
    }
    .artwork {
      display: grid;
      place-content: center;
      min-height: 10.5rem;
      padding: clamp(0.75rem, 8cqw, 1.5rem);
      overflow: hidden;
    }
    .word {
      background: #e4eddf;
    }
    .sudoku {
      background: #ede7f5;
    }
    .merge {
      background: #f9e6d0;
    }
    .letter-row {
      display: flex;
      justify-content: center;
      gap: clamp(0.2rem, 1vw, 0.4rem);
      transform: rotate(-5deg);
    }
    .letter-row span {
      display: grid;
      place-items: center;
      width: clamp(1.4rem, 14cqw, 2.6rem);
      aspect-ratio: 1;
      background: #285743;
      color: white;
      border-radius: 0.4rem;
      font-weight: 800;
      font-size: 1.25rem;
      box-shadow: 0 3px 0 #163d2c;
    }
    .letter-row span:nth-child(2) {
      background: #e9c96a;
      color: #342e22;
      box-shadow: 0 3px 0 #c2a64f;
    }
    .ghost {
      margin-top: 0.45rem;
    }
    .ghost span {
      background: #f7faf4;
      box-shadow: none;
      border: 1px solid #c6d5bf;
    }
    .number-grid {
      display: grid;
      grid-template-columns: repeat(3, clamp(1.3rem, 16cqw, 2.5rem));
      border: 2px solid #6d548a;
      border-radius: 0.5rem;
      overflow: hidden;
      transform: rotate(6deg);
      box-shadow: 5px 5px 0 #d6c9e6;
    }
    .number-grid span {
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      background: #faf7ff;
      border: 1px solid #ded4e9;
      color: #503d69;
      font-weight: 650;
      font-size: 1.1rem;
    }
    .merge-grid {
      display: grid;
      grid-template-columns: repeat(2, clamp(1.8rem, 23cqw, 3.2rem));
      gap: 0.4rem;
      transform: rotate(-7deg);
    }
    .merge-grid span {
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      background: #fff8ec;
      color: #654521;
      border-radius: 0.6rem;
      font-size: 1.45rem;
      font-weight: 800;
      box-shadow: 0 3px 0 #e2c5a2;
    }
    .merge-grid span:nth-child(3) {
      background: #e8b86c;
      color: #352a18;
    }
    .merge-grid span:last-child {
      background: #a74b2b;
      color: white;
      box-shadow: 0 3px 0 #77341d;
    }
  `,
})
export class GameArtwork {
  readonly kind = input<'word' | 'sudoku' | 'merge'>('word');
  protected readonly letters = ['P', 'A', 'U', 'S', 'A'];
  protected readonly sudoku = ['1', '', '3', '', '5', '', '7', '', '9'];
}
