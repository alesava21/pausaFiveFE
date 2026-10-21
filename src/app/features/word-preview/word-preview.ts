import { Component, ElementRef, afterRenderEffect, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export const wordDesigns = [
  {
    id: 1,
    name: 'Essenziale',
    description:
      'Griglia compatta al centro, caselle nette e tastiera vicina. Tutto a portata di mano.',
  },
  {
    id: 2,
    name: 'Classica',
    description:
      'Solo griglia e tastiera: scrivi direttamente nelle caselle, senza un campo separato. Un formato pulito e familiare.',
  },
  {
    id: 3,
    name: 'Compatta',
    description:
      'Una piccola console: griglia raccolta, comandi ravvicinati e tastiera su un pannello morbido. Meno spazio, più gioco.',
  },
  {
    id: 4,
    name: 'Righe',
    description:
      'Ogni tentativo è una fascia numerata. Le lettere respirano su una superficie continua, senza trenta caselle separate.',
  },
  {
    id: 5,
    name: 'A schede',
    description:
      'Sei piccole schede, una per tentativo, disposte a coppie. Una vista panoramica per confrontare subito le parole.',
  },
  {
    id: 6,
    name: 'Verde',
    description:
      'Una plancia verde profondo, lettere color crema e comandi chiari. La stessa palette con un carattere più deciso.',
  },
] as const;

type DemoAttempt = { word: string; marks: string[] };

@Component({
  selector: 'app-word-preview',
  imports: [FormsModule, RouterLink],
  templateUrl: './word-preview.html',
  styleUrls: ['./word-preview.scss', './word-preview-variants.scss'],
})
export class WordPreview {
  readonly variant = input(1);
  readonly designs = wordDesigns;
  readonly columns = [0, 1, 2, 3, 4];
  readonly rows = [0, 1, 2, 3, 4, 5];
  readonly keys = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), 'ZXCVBNM'.split('')];
  readonly attempts = signal<DemoAttempt[]>(this.examples());
  readonly message = signal('');
  readonly focusRequest = signal(0);
  private readonly editor = viewChild<ElementRef<HTMLInputElement>>('editor');
  draft = '';

  constructor() {
    afterRenderEffect(() => {
      this.focusRequest();
      this.editor()?.nativeElement.focus({ preventScroll: true });
    });
  }

  design() {
    return this.designs.find((design) => design.id === this.variant()) ?? this.designs[0];
  }

  write(key: string): void {
    if (this.attempts().length === 6) return;
    this.draft = key === '⌫' ? this.draft.slice(0, -1) : (this.draft + key).slice(0, 5);
    this.focusRequest.update((value) => value + 1);
  }

  submit(): void {
    if (this.attempts().length === 6) return;
    if (!/^[a-z]{5}$/i.test(this.draft)) {
      this.message.set('Scrivi cinque lettere per provare il layout.');
      return;
    }
    this.attempts.update((attempts) => [
      ...attempts,
      { word: this.draft.toUpperCase(), marks: ['miss', 'near', 'hit', 'miss', 'miss'] },
    ]);
    this.draft = '';
    this.message.set('Tentativo dimostrativo: gli indizi sono simulati, non è una partita reale.');
    this.focusRequest.update((value) => value + 1);
  }

  reset(): void {
    this.attempts.set(this.examples());
    this.draft = '';
    this.message.set('');
    this.focusRequest.update((value) => value + 1);
  }

  private examples(): DemoAttempt[] {
    return [
      { word: 'TRENO', marks: ['miss', 'near', 'miss', 'miss', 'hit'] },
      { word: 'CAMPO', marks: ['hit', 'near', 'miss', 'miss', 'hit'] },
    ];
  }
}
