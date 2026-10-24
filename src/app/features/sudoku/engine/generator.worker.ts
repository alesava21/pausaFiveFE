<<<<<<< HEAD
import { expose } from 'comlink';
import { SeededRNG } from './seeded-rng';
import { WorkBudget } from './work-budget';
import { SudokuBoardImpl } from './sudoku-engine';

export interface SudokuGeneratorWorker {
  generate(difficulty: 'EASY' | 'MEDIUM' | 'HARD', seed: number): Promise<{ givens: number[]; solution: number[] }>;
  countSolutions(board: number[], max: number): Promise<number>;
}

export class SudokuGeneratorWorkerImpl implements SudokuGeneratorWorker {
  private rng: SeededRNG;
  private budget: WorkBudget;

  constructor() {
    this.rng = new SeededRNG(Date.now());
    this.budget = new WorkBudget();
  }

  async generate(difficulty: 'EASY' | 'MEDIUM' | 'HARD', seed: number): Promise<{ givens: number[]; solution: number[] }> {
    this.rng = new SeededRNG(seed);
    this.budget.reset();

    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const puzzle = await this.generateDifficulty(difficulty);
      if (await this.isValidPuzzle(puzzle)) {
        const solution = await this.solvePuzzle(puzzle);
        return { givens: puzzle, solution };
      }
    }

    throw new Error('Unable to generate puzzle after all attempts');
  }

  async countSolutions(board: number[], max: number): Promise<number> {
    const boardImpl = new SudokuBoardImpl([...board]);
    return this.countSolutionsWithBudget(boardImpl, max, 86400000);
  }

  private async generateDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): Promise<number[]> {
    const puzzle: number[] = new Array(81).fill(0);
    const solution: number[] = new Array(81).fill(0);

    const placeFirstNumber = () => {
      const cell = this.rng.nextRange(81);
      puzzle[cell] = this.rng.nextRange(9) + 1;
    };

    const solveWithBudget = (maxWork: number, maxTime: number): Promise<boolean> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.solveBoard(new SudokuBoardImpl([...puzzle]), maxWork, maxTime));
        }, 1);
      });
    };

    placeFirstNumber();

    if (!await solveWithBudget(this.budget.workRemaining, this.budget.timeRemaining)) {
      return this.generateDifficulty(difficulty);
    }

    const givensToRemove = this.calculateGivensToRemove(difficulty);
    for (let i = 0; i < givensToRemove; i++) {
      const cell = this.rng.nextRange(81);
      if (puzzle[cell] !== 0) {
        puzzle[cell] = 0;
      }
    }

    return puzzle;
  }

  private calculateGivensToRemove(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): number {
    switch (difficulty) {
      case 'EASY': return 30;
      case 'MEDIUM': return 40;
      case 'HARD': return 45;
      default: return 35;
    }
  }

  private async isValidPuzzle(puzzle: number[]): Promise<boolean> {
    const board = new SudokuBoardImpl([...puzzle]);
    const solutionCount = await this.countSolutionsWithBudget(board, this.budget.workRemaining, this.budget.timeRemaining);
    return solutionCount === 1;
  }

  private async solvePuzzle(puzzle: number[]): Promise<number[]> {
    const board = new SudokuBoardImpl([...puzzle]);
    await this.solveBoard(board, this.budget.workRemaining, this.budget.timeRemaining);
    return board.cells;
  }

  private solveBoard(board: SudokuBoardImpl, maxWork: number, maxTime: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.solveBoardRecursive(board, maxWork, maxTime, Date.now());
        resolve(result);
      }, 1);
    });
  }

  private solveBoardRecursive(
    board: SudokuBoardImpl,
    maxWork: number,
    maxTime: number,
    startTime: number
  ): boolean {
    if (maxWork <= 0 || maxTime <= 0) {
      return false;
    }

    const findEmptyCell = () => {
      for (let i = 0; i < 81; i++) {
        if (board.cells[i] === 0) return i;
      }
      return -1;
    };

    const emptyCell = findEmptyCell();
    if (emptyCell === -1) {
      return true;
    }

    const candidates = board.candidates(emptyCell);
    for (const candidate of candidates) {
      board.cells[emptyCell] = candidate;
      const workTime = 1 + (81 - emptyCell) * 2;
      if (this.budget.checkWork(workTime) && this.budget.checkTime(1)) {
        const result = this.solveBoardRecursive(board, maxWork - workTime, maxTime - 1, startTime + 1);
        if (result) {
          return true;
        }
      }
      board.cells[emptyCell] = 0;
    }

    return false;
  }

  private countSolutionsWithBudget(
    board: SudokuBoardImpl,
    maxWork: number,
    maxTime: number,
    startTime: number = Date.now()
  ): Promise<number> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.countSolutionsRecursive(board, maxWork, maxTime, startTime));
      }, 1);
    });
  }

  private countSolutionsRecursive(
    board: SudokuBoardImpl,
    maxWork: number,
    maxTime: number,
    startTime: number
  ): number {
    if (maxWork <= 0 || maxTime <= 0) {
      return 0;
    }

    const findEmptyCell = () => {
      for (let i = 0; i < 81; i++) {
        if (board.cells[i] === 0) return i;
      }
      return -1;
    };

    const emptyCell = findEmptyCell();
    if (emptyCell === -1) {
      return 1;
    }

    const candidates = board.candidates(emptyCell);
    let count = 0;

    for (const candidate of candidates) {
      board.cells[emptyCell] = candidate;
      const workTime = 1 + (81 - emptyCell) * 2;
      if (this.budget.checkWork(workTime) && this.budget.checkTime(1)) {
        count += this.countSolutionsRecursive(board, maxWork - workTime, maxTime - 1, startTime + 1);
      }
      board.cells[emptyCell] = 0;
    }

    return count;
  }
}

export function initWorker(): SudokuGeneratorWorker {
  return new SudokuGeneratorWorkerImpl();
}

expose(initWorker(), self);
=======
/**
 * Sudoku Generator Web Worker
 * Runs puzzle generation off the main thread for endless mode.
 * Pure TypeScript, no Angular dependencies.
 */

import { Difficulty, generate, SudokuPuzzleDTO, Limits } from './sudoku-engine';

// Worker message protocol types
export interface GenerateRequest {
  readonly requestId: number;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly limits?: Limits;
}

export interface GenerateResponse {
  readonly requestId: number;
  readonly puzzle?: SudokuPuzzleDTO;
  readonly error?: string;
  readonly fallback?: boolean;
}

export interface CancelRequest {
  readonly requestId: number;
  readonly type: 'cancel';
}

type WorkerRequest = GenerateRequest | CancelRequest;

// Track pending requests for cancellation
const pendingRequests = new Map<
  number,
  { difficulty: Difficulty; seed: number; limits?: Limits }
>();

// Generate a simple request ID (in practice, main thread provides this)
const nextRequestId = 1;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  // Handle cancellation
  if ('type' in request && request.type === 'cancel') {
    pendingRequests.delete(request.requestId);
    return;
  }

  // Handle generation request - narrow type
  if ('difficulty' in request) {
    const { requestId, difficulty, seed, limits } = request;

    // Store for potential cancellation
    pendingRequests.set(requestId, { difficulty, seed, limits });

    // Generate puzzle (synchronous in worker, but off main thread)
    try {
      const puzzle = generate(difficulty, seed, limits);
      // Create data-only DTO for structured cloning (no functions)
      const puzzleDTO: SudokuPuzzleDTO = {
        givens: puzzle.givens,
        solution: puzzle.solution,
        difficulty: puzzle.difficulty,
        fallback: puzzle.fallback,
      };
      const response: GenerateResponse = {
        requestId,
        puzzle: puzzleDTO,
        fallback: puzzleDTO.fallback,
      };
      self.postMessage(response);
    } catch (error) {
      const response: GenerateResponse = {
        requestId,
        error: error instanceof Error ? error.message : 'Errore generazione sconosciuto',
      };
      self.postMessage(response);
    } finally {
      pendingRequests.delete(requestId);
    }
  }
};

// Export for testing
export { pendingRequests, nextRequestId };
>>>>>>> origin/feat/task-022-sudoku-engine
