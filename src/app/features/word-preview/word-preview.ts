import { Component, ElementRef, afterRenderEffect, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export const wordDesigns = [
  {
    id: 1,
    name: 'Essenziale',
    description:
      'Griglia compatta al centro, caselle nette e un campo per scrivere. Tutto a portata di mano.',
  },
  {
    id: 2,
    name: 'Focus',
    description:
      'Una parola grande al centro, indizi compatti e comandi in una barra. Una schermata leggera, concentrata sulla scrittura.',
  },
  {
    id: 3,
    name: 'Studio',
    description:
      'Un ambiente luminoso e asimmetrico: scrittura a sinistra e una colonna dedicata agli indizi a destra.',
  },
  {
    id: 4,
    name: 'Bento',
    description:
      'Blocchi modulari, superfici morbide e tipografia decisa: una piccola dashboard della tua partita.',
  },
  {
    id: 5,
    name: 'Aria',
    description:
      'Lettere sospese su uno sfondo sfumato, superfici traslucide e una tastiera discreta. Spazio e leggerezza.',
  },
  {
    id: 6,
    name: 'Editoriale',
    description:
      'Numeri grandi, lettere senza cornice e un’impostazione da rivista contemporanea. Il gioco diventa tipografia.',
  },
] as const;

type DemoAttempt = { word: string; marks: string[] };

@Component({
  selector: 'app-word-preview',
  imports: [FormsModule, RouterLink],
  templateUrl: './word-preview.html',
  styleUrls: [
    './word-preview.scss',
    './word-preview-variants.scss',
    './word-preview-modern.scss',
    './word-preview-modern-variants.scss',
  ],
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
