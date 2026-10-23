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
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, switchMap, tap, throwError } from 'rxjs';
import {
  DailySudokuDto,
  SudokuDigit,
  SudokuFinishDto,
  SudokuSessionDto,
} from '../../../core/api/api-contracts';
import { ApiError } from '../../../core/api/api-error';
import { Button } from '../../../shared/ui/button';
import { Loading } from '../../../shared/ui/loading';
import { StatusMessage } from '../../../shared/ui/status-message';
import { SudokuClient } from '../sudoku-client';
import {
  SudokuBoard,
  applyMove,
  applyNote,
  clearCell,
  hasConflicts,
  isComplete,
  loadBoard,
  saveBoard,
  toServerBoard,
  undo,
} from '../sudoku-state';

@Component({
  selector: 'app-sudoku-daily-page',
  imports: [FormsModule, RouterLink, Button, Loading, StatusMessage],
  templateUrl: './sudoku-daily-page.html',
  styleUrl: './sudoku-daily-page.scss',
})
export class SudokuDailyPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();

  private readonly client = inject(SudokuClient);
  private readonly destroy = inject(DestroyRef);

  readonly puzzle = signal<DailySudokuDto | null>(null);
  readonly puzzleError = signal<string | null>(null);
  readonly session = signal<SudokuSessionDto | null>(null);
  readonly board = signal<SudokuBoard | null>(null);
  readonly selectedIndex = signal<number | null>(null);
  readonly pencilMode = signal(false);
  readonly busy = signal(false);
  readonly verifyBusy = signal(false);
  readonly ready = signal(false);
  readonly message = signal('');
  readonly result = signal<SudokuFinishDto | null>(null);
  readonly storageUnavailable = signal(false);

  private readonly now = signal(Date.now());
  readonly pendingFinish = signal<{ board: readonly SudokuDigit[]; key: string } | null>(null);

  // Derived: showVerify is true when board is complete and no result yet
  readonly showVerify = computed(() => {
    const b = this.board();
    return !this.result() && b !== null && isComplete(b);
  });

  readonly resetReached = computed(() => {
    const p = this.puzzle();
    return p && this.now() >= Date.parse(p.nextResetAt);
  });

  readonly countdown = computed(() => {
    const p = this.puzzle();
    if (!p) return '';
    const seconds = Math.max(0, Math.ceil((Date.parse(p.nextResetAt) - this.now()) / 1000));
    if (!Number.isFinite(seconds)) return '';
    return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  });

  readonly resetTime = computed(() => {
    const p = this.puzzle();
    if (!p) return '';
    const reset = Date.parse(p.nextResetAt);
    return Number.isFinite(reset)
      ? new Intl.DateTimeFormat('it-IT', {
          timeZone: 'Europe/Rome',
          hour: '2-digit',
          minute: '2-digit',
        }).format(reset)
      : '';
  });

  readonly cellElements = viewChildren<ElementRef<HTMLButtonElement>>('cellEl');
  private readonly gridEl = viewChild<ElementRef<HTMLDivElement>>('gridEl');
  readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  constructor() {
    afterRenderEffect(() => {
      if (this.ready() && !this.busy() && !this.verifyBusy() && !this.resetReached()) {
        const sel = this.selectedIndex();
        const cells = this.cellElements();
        if (sel !== null && cells[sel]) {
          cells[sel].nativeElement.focus({ preventScroll: true });
        }
      }
    });

    afterNextRender(() => {
      const tick = () => this.now.set(Date.now());
      const timer = window.setInterval(tick, 1000);
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

  open(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    this.result.set(null);
    this.puzzleError.set(null);

    this.client
      .daily()
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof ApiError && error.status === 503) {
            this.puzzleError.set(
              'Il Sudoku del giorno non è ancora disponibile. Riprova più tardi.',
            );
          } else {
            this.puzzleError.set(
              'Impossibile caricare il puzzle. Controlla la connessione e riprova.',
            );
          }
          return throwError(() => error);
        }),
        switchMap((daily) => {
          this.puzzle.set(daily);
          this.now.set(Date.now());
          const loadedBoard = loadBoard(daily.puzzleId, daily.givens);
          if (loadedBoard !== (this.board() ?? ({} as SudokuBoard))) {
            this.storageUnavailable.set(false);
          }
          this.board.set(loadedBoard);
          this.selectedIndex.set(null);
          this.pencilMode.set(false);
          // showVerify is now computed from board state
          return this.client.openSession();
        }),
        catchError((error: unknown) => {
          if (error instanceof ApiError && [400, 401, 403, 404, 422, 429].includes(error.status)) {
            this.message.set('Non è stato possibile avviare la partita. Riprova.');
          } else {
            this.message.set('Connessione incerta. Controlla la rete e premi «Recupera partita».');
          }
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (session) => {
          this.now.set(Date.now());
          if (session.puzzleId !== this.puzzle()?.puzzleId) {
            this.message.set('La sfida è cambiata. Ricarico la griglia di oggi.');
            this.open();
            return;
          }
          this.session.set(session);
          if (session.status === 'WON') {
            this.showResult(session);
          } else if (session.status === 'EXPIRED') {
            this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
          }
        },
        error: () => {
          /* error handled in catchError */
        },
      });
  }

  private showResult(session: SudokuSessionDto): void {
    this.client.getSession(session.sessionId).subscribe({
      next: (full) => {
        this.session.set(full);
        if (full.status === 'WON') {
          this.result.set({
            status: 'WON',
            completed: true,
            elapsedSeconds: 0,
            errors: 0,
          });
          this.message.set('Complimenti! Hai completato il Sudoku.');
        } else if (full.status === 'EXPIRED') {
          this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
        }
      },
      error: () => {
        this.message.set('Impossibile recuperare il risultato. Riprova.');
      },
    });
  }

  selectCell(index: number): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const b = this.board();
    if (!b) return;
    // Idempotent selection: clicking an already-selected cell keeps it selected
    // (focus handler may have already set it; click should not toggle off)
    this.selectedIndex.set(index);
    this.pencilMode.set(false);
    // WebKit mouse activation can blur an already-focused native button.
    // The same selection does not notify afterRenderEffect, so restore focus
    // as part of the explicit click/keyboard action, without waiting for a render.
    this.cellElements()[index]?.nativeElement.focus({ preventScroll: true });
  }

  setDigit(digit: number): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const b = this.board();
    const sel = this.selectedIndex();
    if (!b || sel === null) return;
    if (b.cells[sel].isGiven) {
      this.message.set('Non puoi modificare un indizio.');
      return;
    }
    this.board.set(applyMove(b, sel, digit as SudokuDigit));
    this.saveAndCheck();
  }

  clearCell(): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const b = this.board();
    const sel = this.selectedIndex();
    if (!b || sel === null) return;
    if (b.cells[sel].isGiven) {
      this.message.set('Non puoi cancellare un indizio.');
      return;
    }
    this.board.set(clearCell(b, sel));
    this.saveAndCheck();
  }

  toggleNote(digit: number): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const b = this.board();
    const sel = this.selectedIndex();
    if (!b || sel === null) return;
    if (b.cells[sel].isGiven || b.cells[sel].value !== 0) return;
    this.board.set(applyNote(b, sel, digit as SudokuDigit));
    saveBoard(this.board()!);
  }

  undoMove(): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const b = this.board();
    if (!b) return;
    const undone = undo(b);
    if (undone) {
      this.board.set(undone);
      saveBoard(undone);
      this.message.set('Mossa annullata.');
    } else {
      this.message.set('Nessuna mossa da annullare.');
    }
  }

  togglePencil(): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    this.pencilMode.update((v) => !v);
  }

  private saveAndCheck(): void {
    const b = this.board();
    if (!b) return;
    saveBoard(b);
    // showVerify is computed from board state
    if (isComplete(b) && hasConflicts(b)) {
      this.message.set('Ci sono conflitti nella griglia. Controlla i numeri inseriti.');
    } else {
      this.message.set('');
    }
  }

  verify(): void {
    if (this.verifyBusy() || this.busy() || !this.session() || !this.board()) return;
    const session = this.session()!;
    if (session.puzzleId !== this.puzzle()?.puzzleId) {
      this.message.set('La sfida è cambiata. Ricarico la griglia di oggi.');
      this.open();
      return;
    }
    if (session.status !== 'ACTIVE') {
      this.message.set('La partita non è più attiva.');
      return;
    }
    if (this.resetReached()) {
      this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
      return;
    }

    const board = toServerBoard(this.board()!);
    if (board.some((v) => v === 0)) {
      this.message.set('Completa la griglia prima di verificare.');
      return;
    }

    this.verifyBusy.set(true);
    this.message.set('');

    this.client
      .finish(session.sessionId, board)
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof ApiError) {
            if (error.status === 400) {
              this.message.set('Dati non validi. Ricarica e riprova.');
              this.pendingFinish.set(null);
            } else if (error.status === 422) {
              this.message.set('Controlla i numeri inseriti: la soluzione non è corretta.');
              this.verifyBusy.set(false);
              this.pendingFinish.set(null);
              return throwError(() => error);
            } else if (error.status === 409) {
              return this.client.getSession(session.sessionId).pipe(
                tap((state) => {
                  this.session.set(state);
                  if (state.status === 'WON') {
                    this.showResult(state);
                  } else if (state.status === 'EXPIRED') {
                    this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
                  } else if (state.status === 'ACTIVE') {
                    this.message.set("Partita già conclusa in un'altra scheda.");
                  }
                }),
                switchMap(() => throwError(() => error)),
              );
            } else if (error.status === 0) {
              this.message.set(
                'Invio non confermato. Controlla la connessione e premi «Riprova verifica».',
              );
              this.pendingFinish.set({ board, key: crypto.randomUUID() });
              this.verifyBusy.set(false);
              return throwError(() => error);
            }
          }
          // For all other errors (401, 403, 429, 500, 503, etc.)
          this.message.set('Errore durante la verifica. Riprova.');
          this.pendingFinish.set(null);
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          // Always release the verification lock
          this.verifyBusy.set(false);
        }),
      )
      .subscribe({
        next: (finish: SudokuFinishDto) => {
          this.pendingFinish.set(null);
          this.result.set(finish);
          this.session.update((s) => (s ? { ...s, status: 'WON' as const } : s));
          this.message.set(
            `Complimenti! Completato in ${this.formatElapsed(finish.elapsedSeconds)}.`,
          );
        },
        error: () => {
          /* handled in catchError */
        },
      });
  }

  retryVerify(): void {
    if (!this.pendingFinish() || !this.session()) return;
    const session = this.session()!;
    this.client.getSession(session.sessionId).subscribe({
      next: (state) => {
        if (state.status === 'WON') {
          this.showResult(state);
          this.pendingFinish.set(null);
          return;
        }
        if (state.status === 'EXPIRED') {
          this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
          this.pendingFinish.set(null);
          return;
        }
        this.session.set(state);
        this.verifyBusy.set(true);
        this.message.set('');
        // Use current board state, not stale pendingFinish
        const currentBoard = toServerBoard(this.board()!);
        this.client
          .finish(state.sessionId, currentBoard)
          .pipe(
            catchError((error: unknown) => {
              if (error instanceof ApiError && error.status === 409) {
                return this.client.getSession(state.sessionId).pipe(
                  tap((s) => {
                    this.session.set(s);
                    if (s.status === 'WON') this.showResult(s);
                    else
                      this.message.set('La sfida è scaduta. Apri quella di oggi per continuare.');
                  }),
                  switchMap(() => throwError(() => error)),
                );
              }
              this.message.set('Errore durante la verifica. Riprova.');
              this.verifyBusy.set(false);
              return throwError(() => error);
            }),
            takeUntilDestroyed(this.destroy),
            finalize(() => {
              // Always release the verification lock
              this.verifyBusy.set(false);
            }),
          )
          .subscribe({
            next: (finish: SudokuFinishDto) => {
              this.pendingFinish.set(null);
              this.result.set(finish);
              this.message.set(
                `Complimenti! Completato in ${this.formatElapsed(finish.elapsedSeconds)}.`,
              );
            },
            error: () => {},
          });
      },
      error: () => {
        this.message.set('Impossibile recuperare lo stato. Riprova.');
        this.verifyBusy.set(false);
      },
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.busy() || this.verifyBusy() || this.resetReached() || this.result()) return;
    const sel = this.selectedIndex();
    if (sel === null) {
      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        this.selectCell(0);
        event.preventDefault();
      }
      return;
    }

    const b = this.board();
    if (!b) return;

    switch (event.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (this.pencilMode()) {
          this.toggleNote(parseInt(event.key, 10));
        } else {
          this.setDigit(parseInt(event.key, 10));
        }
        event.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        this.clearCell();
        event.preventDefault();
        break;
      case '0':
        this.clearCell();
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (sel >= 9) this.selectCell(sel - 9);
        event.preventDefault();
        break;
      case 'ArrowDown':
        if (sel < 72) this.selectCell(sel + 9);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        if (sel % 9 !== 0) this.selectCell(sel - 1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        if (sel % 9 !== 8) this.selectCell(sel + 1);
        event.preventDefault();
        break;
      case 'Enter':
        if (this.showVerify()) this.verify();
        event.preventDefault();
        break;
      case 'p':
      case 'P':
        this.togglePencil();
        event.preventDefault();
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          this.undoMove();
          event.preventDefault();
        }
        break;
    }
  }

  cellClasses(index: number): Record<string, boolean> {
    const b = this.board();
    if (!b) return {};
    const cell = b.cells[index];
    const row = Math.floor(index / 9);
    const col = index % 9;
    return {
      given: cell.isGiven,
      selected: this.selectedIndex() === index,
      'has-notes': cell.notes.length > 0 && cell.value === 0,
      'border-top': row % 3 === 0,
      'border-left': col % 3 === 0,
      'border-bottom': row === 8,
      'border-right': col === 8,
    };
  }

  noteClasses(index: number, digit: SudokuDigit): Record<string, boolean> {
    const b = this.board();
    if (!b) return {};
    return { active: b.cells[index].notes.includes(digit) };
  }

  private formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  protected readonly Math = Math;
}
