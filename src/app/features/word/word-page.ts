import {
  Component,
  computed,
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
import { RouterLink } from '@angular/router';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import { GameMode, LetterEvaluation, WordSessionDto } from '../../core/api/api-contracts';
import { ApiError } from '../../core/api/api-error';
import { Button } from '../../shared/ui/button';
import { WordClient } from './word-client';

@Component({
  selector: 'app-word-page',
  imports: [FormsModule, RouterLink, Button],
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
  readonly startUncertain = signal(false);
  private readonly now = signal(Date.now());
  readonly resetReached = computed(() => {
    const game = this.game();
    return game?.mode === 'DAILY' && this.now() >= Date.parse(game.nextResetAt);
  });
  readonly countdown = computed(() => {
    const reset = this.game()?.nextResetAt;
    if (!reset) return '';
    const seconds = Math.max(0, Math.ceil((Date.parse(reset) - this.now()) / 1000));
    if (!Number.isFinite(seconds)) return '';
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  });
  readonly resetTime = computed(() => {
    const reset = Date.parse(this.game()?.nextResetAt ?? '');
    return Number.isFinite(reset)
      ? new Intl.DateTimeFormat('it-IT', {
          timeZone: 'Europe/Rome',
          hour: '2-digit',
          minute: '2-digit',
        }).format(reset)
      : '';
  });
  guess = '';
  readonly emptyRows = [0, 1, 2, 3, 4, 5];
  readonly columns = [0, 1, 2, 3, 4];
  private readonly guessInput = viewChild<ElementRef<HTMLInputElement>>('guessInput');
  private readonly client = inject(WordClient);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterRenderEffect(() => {
      const input = this.guessInput()?.nativeElement;
      if (this.ready() && !this.busy() && !this.pending() && !this.resetReached() && input)
        input.focus({ preventScroll: true });
    });
    afterNextRender(() => {
      const tick = () => this.now.set(Date.now());
      const timer = window.setInterval(tick, 1000);
      // Refresh immediately on return from a suspended/background mobile tab.
      document.addEventListener('visibilitychange', tick);
      window.addEventListener('focus', tick);
      this.destroy.onDestroy(() => {
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', tick);
        window.removeEventListener('focus', tick);
      });
      this.ready.set(true);
      this.open();
    });
  }

  open(newGame = false): void {
    if (
      this.busy() ||
      (newGame &&
        (this.mode() !== 'ENDLESS' ||
          !['WON', 'LOST'].includes(this.game()?.status ?? '') ||
          this.startUncertain()))
    )
      return;
    this.busy.set(true);
    this.message.set('');
    this.client
      .open(this.mode(), newGame)
      .pipe(
        catchError((error: unknown) => {
          // Another tab, or a lost response, may have already started the next game.
          if (newGame && error instanceof ApiError && error.status === 409)
            return this.client.open('ENDLESS', false);
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (game) => {
          this.now.set(Date.now());
          this.game.set(game);
          this.startUncertain.set(false);
          this.pending.set(null);
          this.guess = '';
        },
        error: (error: unknown) => {
          if (
            newGame &&
            !(error instanceof ApiError && [400, 401, 403, 404, 422, 429].includes(error.status))
          ) {
            this.startUncertain.set(true);
            this.message.set(
              'Apertura non confermata. Controlla la connessione e premi «Recupera partita».',
            );
          } else this.fail(error);
        },
      });
  }

  submit(): void {
    const game = this.game();
    this.now.set(Date.now());
    if (!game || game.status !== 'ACTIVE' || this.busy() || this.resetReached()) return;
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
        catchError((error: unknown) => {
          // A 409 can mean expiry or completion in another tab. Read authoritative state.
          if (error instanceof ApiError && error.status === 409)
            return this.client.session(game.sessionId).pipe(
              tap((state) => this.game.set(state)),
              switchMap(() => throwError(() => error)),
            );
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (state) => {
          this.game.set(state);
          this.pending.set(null);
          this.guess = '';
          this.message.set(
            state.status === 'EXPIRED'
              ? 'La sfida è scaduta. Apri la sfida di oggi per continuare.'
              : state.status === 'WON'
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

  erase(): void {
    if (this.busy() || this.pending() || this.resetReached() || this.game()?.status !== 'ACTIVE')
      return;
    this.guess = this.guess.slice(0, -1);
    this.guessInput()?.nativeElement.focus({ preventScroll: true });
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
            : this.pending()
              ? 'Invio non confermato. Controlla la connessione e premi «Riprova invio».'
              : 'Non è stato possibile aprire la partita. Riprova.',
    );
  }
}
