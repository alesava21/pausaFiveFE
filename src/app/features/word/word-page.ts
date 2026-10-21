import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { GameMode, LetterEvaluation, WordSessionDto } from '../../core/api/api-contracts';
import { ApiError } from '../../core/api/api-error';
import { Button } from '../../shared/ui/button';
import { WordClient } from './word-client';

@Component({
  selector: 'app-word-page',
  imports: [FormsModule, Button],
  templateUrl: './word-page.html',
  styleUrl: './word-page.scss',
})
export class WordPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly mode = input<GameMode>('DAILY');
  readonly game = signal<WordSessionDto | null>(null);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly ready = signal(false);
  readonly pending = signal<{ guess: string; key: string } | null>(null);
  guess = '';
  readonly emptyRows = [0, 1, 2, 3, 4, 5];
  readonly columns = [0, 1, 2, 3, 4];
  readonly keyboard = ['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), 'ZXCVBNM⌫'.split('')];
  private readonly guessInput = viewChild<ElementRef<HTMLInputElement>>('guessInput');
  private readonly client = inject(WordClient);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterRenderEffect(() => {
      const input = this.guessInput()?.nativeElement;
      if (this.ready() && !this.busy() && !this.pending() && input)
        input.focus({ preventScroll: true });
    });
    afterNextRender(() => {
      this.ready.set(true);
      this.open();
    });
  }

  open(newGame = false): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    this.client
      .open(this.mode(), newGame)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (game) => {
          this.game.set(game);
          this.pending.set(null);
          this.guess = '';
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  submit(): void {
    const game = this.game();
    if (!game || game.status !== 'ACTIVE' || this.busy()) return;
    if (!this.pending()) {
      if (this.guess.length !== 5 || !/^[A-Za-z]{5}$/.test(this.guess)) {
        this.message.set('Inserisci cinque lettere A-Z, senza spazi o accenti.');
        return;
      }
      this.pending.set({ guess: this.guess.toUpperCase(), key: crypto.randomUUID() });
    }
    const pending = this.pending();
    if (!pending) return;
    this.busy.set(true);
    this.message.set('');
    this.client
      .guess(game.sessionId, pending.guess, pending.key)
      .pipe(
        switchMap(() => this.client.session(game.sessionId)),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (state) => {
          this.game.set(state);
          this.pending.set(null);
          this.guess = '';
          this.message.set(
            state.status === 'WON'
              ? 'Hai indovinato!'
              : state.status === 'LOST'
                ? 'Tentativi terminati.'
                : `Tentativo registrato. Ne restano ${state.remainingAttempts}.`,
          );
        },
        error: (error: unknown) => {
          if (
            error instanceof ApiError &&
            [400, 401, 403, 404, 409, 422, 429].includes(error.status)
          )
            this.pending.set(null);
          this.fail(error);
        },
      });
  }

  typeKey(key: string): void {
    if (this.busy() || this.pending() || this.game()?.status !== 'ACTIVE') return;
    this.guess = key === '⌫' ? this.guess.slice(0, -1) : (this.guess + key).slice(0, 5);
  }

  keyState(key: string): LetterEvaluation | undefined {
    const priority = { ABSENT: 1, PRESENT: 2, CORRECT: 3 };
    let result: LetterEvaluation | undefined;
    for (const attempt of this.game()?.attempts ?? []) {
      for (let index = 0; index < attempt.guess.length; index++) {
        const value = attempt.evaluation[index];
        if (attempt.guess[index] === key && (!result || priority[value] > priority[result]))
          result = value;
      }
    }
    return result;
  }

  label(value: LetterEvaluation): string {
    return value === 'CORRECT'
      ? 'posizione corretta'
      : value === 'PRESENT'
        ? 'presente in altra posizione'
        : 'assente';
  }

  private fail(error: unknown): void {
    this.message.set(
      error instanceof ApiError && error.status === 422
        ? 'Questa parola non è nel dizionario dei tentativi ammessi.'
        : error instanceof ApiError && error.status === 503
          ? 'Le parole della sfida sono in preparazione. Riprova più tardi.'
          : error instanceof ApiError
            ? error.message
            : 'Non è stato possibile aprire la partita. Riprova.',
    );
  }
}
