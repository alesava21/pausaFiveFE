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
    name: 'Quaderno',
    description:
      'Un piccolo quaderno di parole: righe numerate, lettere morbide e scrittura su una riga dedicata.',
  },
  {
    id: 3,
    name: 'Una parola alla volta',
    description:
      'Il tentativo attuale in primo piano. Quelli precedenti rimangono come piccoli indizi.',
  },
  {
    id: 4,
    name: 'Doppio pannello',
    description:
      'A sinistra scrivi, a destra segui i tentativi. Una postazione ordinata, con spazio per pensare.',
  },
  {
    id: 5,
    name: 'Tessere',
    description:
      'Lettere come pedine da tavolo, bordi arrotondati e una superficie verde delicata.',
  },
  {
    id: 6,
    name: 'Tipografico',
    description:
      'Lettere grandi, linee sottili e spazio bianco. Una pagina leggera, senza scatole intorno alle parole.',
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
