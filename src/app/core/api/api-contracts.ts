/** Contratti pubblici definiti in PausaFiveBE/docs/03-API-CONTRACTS.md. */
export interface ApiProblemDto {
  readonly type: 'about:blank';
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly code: string;
  readonly traceId: string;
}

export interface CsrfDto {
  readonly headerName: 'X-CSRF-TOKEN';
  readonly token: string;
}

export type GameSlug = 'word' | 'sudoku' | '2048';
export type GameMode = 'DAILY' | 'ENDLESS';
export interface GamesDto {
  readonly games: readonly {
    readonly slug: GameSlug;
    readonly title: string;
    readonly category: 'parole' | 'logica';
    readonly modes: readonly GameMode[];
    readonly enabled: boolean;
  }[];
}

export interface DailyTimingDto {
  /** Data YYYY-MM-DD in Europe/Rome; non ricavare il reset aggiungendo 24 ore. */
  readonly serverDate: string;
  readonly nextResetAt: string;
}
export interface DailyIndexDto extends DailyTimingDto {
  readonly challenges: readonly {
    readonly game: 'word' | 'sudoku';
    readonly puzzleId: string;
    readonly status: 'AVAILABLE';
  }[];
}
export interface DailyWordDto extends DailyTimingDto {
  readonly puzzleId: string;
  readonly wordLength: 5;
  readonly maxAttempts: 6;
}
export type SudokuDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface DailySudokuDto extends DailyTimingDto {
  readonly puzzleId: string;
  readonly size: 9;
  readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  /** 81 celle; la lunghezza del payload va validata dal consumer. */
  readonly givens: readonly SudokuDigit[];
}
export type CreateSessionRequest = Record<string, never>;
export interface WordGuessRequest {
  readonly guess: string;
}
export type LetterEvaluation = 'ABSENT' | 'PRESENT' | 'CORRECT';
interface WordGuessOutcomeDto {
  readonly attemptNumber: number;
  readonly evaluation: readonly LetterEvaluation[];
  readonly remainingAttempts: number;
}
export type WordGuessDto = WordGuessOutcomeDto &
  (
    | {
        readonly status: 'ACTIVE';
        readonly completed: false;
        readonly won: false;
        readonly solution?: never;
      }
    | {
        readonly status: 'WON';
        readonly completed: true;
        readonly won: true;
        readonly solution?: string;
      }
    | {
        readonly status: 'LOST';
        readonly completed: true;
        readonly won: false;
        readonly solution?: string;
      }
  );
export interface SudokuFinishRequest {
  readonly board: readonly SudokuDigit[];
}
export interface SudokuFinishDto {
  readonly status: 'WON';
  readonly completed: true;
  readonly elapsedSeconds: number;
  readonly errors: number;
}
