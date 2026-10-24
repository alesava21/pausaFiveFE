/**
 * Sudoku Engine - Pure TypeScript implementation for endless mode generation.
 * Ported from Java reference implementation (TASK-019) with seeded RNG and work budget.
 * No HTTP, no backend dependencies, fully offline capable.
 */

// ============================================================================
// Types and Constants
// ============================================================================

/** Difficulty levels for endless Sudoku generation. */
export const Difficulty = {
  EASY: 'EASY' as const,
  MEDIUM: 'MEDIUM' as const,
  HARD: 'HARD' as const,
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

/** Immutable board of 81 cells (row-major), 0 = empty. Never logs content. */
export class SudokuBoard {
  private readonly _cells: readonly number[];

  constructor(cells: readonly number[]) {
    if (cells.length !== 81) {
      throw new Error('La griglia deve contenere 81 celle.');
    }
    for (const v of cells) {
      if (!Number.isInteger(v) || v < 0 || v > 9) {
        throw new Error('Le celle devono contenere numeri interi da 0 a 9.');
      }
    }
    this._cells = Object.freeze([...cells]);
  }

  cell(index: number): number {
    return this._cells[index];
  }

  toArray(): number[] {
    return [...this._cells];
  }

  equals(other: SudokuBoard): boolean {
    return this._cells.every((v, i) => v === other._cells[i]);
  }

  hashCode(): number {
    let h = 0;
    for (const v of this._cells) {
      h = (h * 31 + v) | 0;
    }
    return h;
  }

  toString(): string {
    return 'SudokuBoard[contenuto riservato]';
  }

  static fromString(s: string): SudokuBoard {
    if (s.length !== 81 || !/^[0-9]{81}$/.test(s)) {
      throw new Error('Stringa griglia non valida.');
    }
    return new SudokuBoard(s.split('').map((c) => parseInt(c, 10)));
  }
}

/** Data-only DTO for worker serialization (no functions). */
export interface SudokuPuzzleDTO {
  readonly givens: readonly number[];
  readonly solution: readonly number[];
  readonly difficulty: Difficulty;
  readonly fallback: boolean;
}

/** Result of puzzle generation with verification capability. */
export interface SudokuPuzzle extends SudokuPuzzleDTO {
  verify(): void;
}

/** Result of logical solving. */
export interface LogicalResult {
  readonly solved: boolean;
  readonly difficulty: Difficulty;
  readonly steps: number;
  readonly board: SudokuBoard;
}

/** Work budget limits for generation/search. */
export interface Limits {
  readonly attempts: number;
  readonly maxWork: number;
  readonly maxDurationMs: number;
}

export const DEFAULT_LIMITS: Limits = {
  attempts: 12,
  maxWork: 250_000,
  maxDurationMs: 500,
};

// ============================================================================
// Seeded RNG (Version 1 - deterministic in TypeScript)
// ============================================================================

/**
 * Seeded random number generator.
 * Deterministic in TypeScript; does NOT promise identity with java.util.Random.
 * Project-specific four-word 64-bit stream, version TS v1.
 */
export class SeededRNG {
  private state: BigUint64Array;

  constructor(seed: number) {
    // Initialize the TS v1 state from a 32-bit seed
    let x = BigInt(seed >>> 0);
    this.state = new BigUint64Array(4);
    for (let i = 0; i < 4; i++) {
      x = (x + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
      let z = x;
      z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
      z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
      z = z ^ (z >> 31n);
      this.state[i] = z & 0xffffffffffffffffn;
    }
  }

  /** Returns next random 64-bit integer as bigint (full precision). */
  nextBigInt(): bigint {
    const s0 = this.state[0];
    const s1 = this.state[1];
    const result = (s0 + s1) & 0xffffffffffffffffn;

    const s1_new = s1 << 17n;
    this.state[2] ^= s0;
    this.state[3] ^= s1;
    this.state[1] ^= s0;
    this.state[0] ^= s1_new;
    this.state[2] ^= s1_new;

    this.state[3] = (this.state[3] << 45n) | (this.state[3] >> 19n);

    return result;
  }

  /** Returns next random 64-bit integer as number (loses precision, use nextBigInt() for full precision). */
  next(): number {
    return Number(this.nextBigInt());
  }

  /** Returns random integer in [0, n) using full 64-bit precision. */
  nextInt(n: number): number {
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Bound must be positive');
    // Rejection sampling for unbiased result using full 64-bit precision
    const max = 0x10000000000000000n; // 2^64
    const threshold = max - (max % BigInt(n));
    let x: bigint;
    do {
      x = this.nextBigInt();
    } while (x >= threshold);
    return Number(x % BigInt(n));
  }

  /** Fisher-Yates shuffle, returns new array. */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ============================================================================
// Work Budget
// ============================================================================

/** Thrown when work/time budget is exhausted. Never interpreted as uniqueness proof. */
export class WorkBudgetExhausted extends Error {
  constructor() {
    super('Budget di preparazione Sudoku esaurito.');
    this.name = 'WorkBudgetExhausted';
  }
}

export class WorkBudget {
  private readonly maxWork: number;
  private readonly maxNanos: number;
  private readonly clock: () => number;
  private readonly started: number;
  private used = 0;

  constructor(
    maxWork: number,
    maxDurationMs: number,
    clock: () => number = () => performance.now() * 1_000_000,
  ) {
    if (
      !Number.isSafeInteger(maxWork) ||
      maxWork < 0 ||
      !Number.isFinite(maxDurationMs) ||
      maxDurationMs < 0
    ) {
      throw new Error('Budget non valido.');
    }
    this.maxWork = maxWork;
    this.maxNanos = maxDurationMs * 1_000_000;
    this.clock = clock;
    this.started = clock();
  }

  tick(): void {
    if (this.used >= this.maxWork || this.clock() - this.started >= this.maxNanos) {
      throw new WorkBudgetExhausted();
    }
    this.used++;
  }

  getUsed(): number {
    return this.used;
  }

  static fromLimits(limits: Limits, clock?: () => number): WorkBudget {
    return new WorkBudget(limits.maxWork, limits.maxDurationMs, clock);
  }
}

// ============================================================================
// Constants and Helpers
// ============================================================================

const ALL_CANDIDATES = 0b1111111110; // bits 1-9 set

function boxIndex(cell: number): number {
  return Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
}

function bitCount(x: number): number {
  return x.toString(2).split('1').length - 1;
}

function lowestBit(x: number): number {
  return x & -x;
}

function trailingZeros(x: number): number {
  return (x & -x).toString(2).length - 1;
}

// ============================================================================
// Validator
// ============================================================================

/** Checks partial board consistency (no duplicates in row/col/box). */
export function isValid(board: SudokuBoard): boolean {
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);

  const cells = board.toArray();
  for (let i = 0; i < 81; i++) {
    const value = cells[i];
    if (value === 0) continue;
    const bit = 1 << value;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const box = boxIndex(i);

    if (rows[row] & bit || cols[col] & bit || boxes[box] & bit) {
      return false;
    }
    rows[row] |= bit;
    cols[col] |= bit;
    boxes[box] |= bit;
  }
  return true;
}

/** Checks if board is complete AND valid. */
export function isComplete(board: SudokuBoard): boolean {
  const cells = board.toArray();
  for (const v of cells) {
    if (v === 0) return false;
  }
  return isValid(board);
}

/** Checks if solution matches givens. */
export function matchesGivens(givens: SudokuBoard, solution: SudokuBoard): boolean {
  if (!isComplete(solution)) return false;
  const g = givens.toArray();
  const s = solution.toArray();
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0 && g[i] !== s[i]) return false;
  }
  return true;
}

// ============================================================================
// Exact Solver (MRV backtracking, stops at 2 solutions)
// ============================================================================

interface SolverAnalysis {
  solutionCount: number;
  firstSolution: SudokuBoard | null;
  searchNodes: number;
}

function solveExact(
  board: SudokuBoard,
  limit: number,
  budget: WorkBudget,
  rng?: SeededRNG,
): SolverAnalysis {
  if (!isValid(board)) {
    return { solutionCount: 0, firstSolution: null, searchNodes: 0 };
  }

  const cells = board.toArray();
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);

  for (let i = 0; i < 81; i++) {
    const v = cells[i];
    if (v !== 0) {
      const bit = 1 << v;
      rows[Math.floor(i / 9)] |= bit;
      cols[i % 9] |= bit;
      boxes[boxIndex(i)] |= bit;
    }
  }

  let count = 0;
  let nodes = 0;
  let firstSolution: number[] | null = null;

  function visit(): void {
    budget.tick();
    nodes++;

    // MRV: find cell with fewest candidates
    let selected = -1;
    let mask = 0;
    let smallest = 10;

    for (let i = 0; i < 81; i++) {
      if (cells[i] === 0) {
        const candidates =
          ALL_CANDIDATES & ~(rows[Math.floor(i / 9)] | cols[i % 9] | boxes[boxIndex(i)]);
        const size = bitCount(candidates);
        if (size === 0) return;
        if (size < smallest) {
          selected = i;
          mask = candidates;
          smallest = size;
        }
        if (size === 1) break;
      }
    }

    if (selected === -1) {
      count++;
      if (firstSolution === null) {
        firstSolution = [...cells];
      }
      return;
    }

    const row = Math.floor(selected / 9);
    const col = selected % 9;
    const box = boxIndex(selected);

    while (mask !== 0 && count < limit) {
      let bit = lowestBit(mask);
      if (rng !== undefined) {
        const candidates = bitCount(mask);
        const pick = rng.nextInt(candidates);
        let remaining = mask;
        for (let p = 0; p < pick; p++) {
          remaining &= remaining - 1;
        }
        bit = lowestBit(remaining);
      }
      mask &= ~bit;

      cells[selected] = trailingZeros(bit);
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;

      visit();

      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[box] &= ~bit;
      cells[selected] = 0;
    }
  }

  visit();

  return {
    solutionCount: count,
    firstSolution: firstSolution ? new SudokuBoard(firstSolution) : null,
    searchNodes: nodes,
  };
}

/** Exact solver class for testing and internal use. */
export class SudokuSolver {
  analyze(board: SudokuBoard, budget?: WorkBudget, rng?: SeededRNG): SolverAnalysis {
    const workBudget = budget ?? new WorkBudget(Number.MAX_SAFE_INTEGER, 86400_000);
    return solveExact(board, 2, workBudget, rng);
  }

  complete(rng: SeededRNG, budget: WorkBudget): SudokuBoard {
    const empty = new SudokuBoard(new Array(81).fill(0));
    const result = solveExact(empty, 1, budget, rng);
    if (!result.firstSolution) {
      throw new WorkBudgetExhausted();
    }
    return result.firstSolution;
  }
}

export function countSolutions(board: SudokuBoard, max = 2, budget?: WorkBudget): number {
  if (!Number.isInteger(max) || max < 1 || max > 2) {
    throw new Error('max deve essere 1 o 2.');
  }
  const limit = max;
  const workBudget = budget ?? new WorkBudget(Number.MAX_SAFE_INTEGER, 86400_000);
  return solveExact(board, limit, workBudget).solutionCount;
}

export function solve(board: SudokuBoard): SudokuBoard | null {
  const result = solveExact(board, 1, new WorkBudget(Number.MAX_SAFE_INTEGER, 86400_000));
  return result.firstSolution;
}

// ============================================================================
// Logical Solver (singles, locked candidates, naked pairs)
// ============================================================================

const UNITS: number[][] = (() => {
  const result: number[][] = new Array(27);
  for (let i = 0; i < 27; i++) result[i] = new Array(9);
  for (let i = 0; i < 81; i++) {
    result[Math.floor(i / 9)][i % 9] = i; // rows 0-8
    result[9 + (i % 9)][Math.floor(i / 9)] = i; // cols 9-17
    // Box index within box: (row % 3) * 3 + (col % 3) = (i/9%3)*3 + i%3
    result[18 + boxIndex(i)][(Math.floor(i / 9) % 3) * 3 + (i % 3)] = i; // boxes 18-26
  }
  return result;
})();

class LogicalState {
  readonly cells: number[];
  readonly candidates: number[];

  constructor(board: SudokuBoard) {
    this.cells = board.toArray();
    this.candidates = new Array(81).fill(0);
    for (let i = 0; i < 81; i++) {
      if (this.cells[i] === 0) {
        let used = 0;
        for (let j = 0; j < 81; j++) {
          if (this.peers(i, j)) used |= 1 << this.cells[j];
        }
        this.candidates[i] = ALL_CANDIDATES & ~used;
      }
    }
  }

  peers(a: number, b: number): boolean {
    return (
      Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || boxIndex(a) === boxIndex(b)
    );
  }

  contradiction(): boolean {
    // Cell with no candidates
    for (let i = 0; i < 81; i++) {
      if (this.cells[i] === 0 && this.candidates[i] === 0) return true;
    }
    // Unit missing a value
    for (const unit of UNITS) {
      for (let value = 1; value <= 9; value++) {
        const bit = 1 << value;
        let possible = false;
        for (const cell of unit) {
          if (this.cells[cell] === value || (this.candidates[cell] & bit) !== 0) {
            possible = true;
            break;
          }
        }
        if (!possible) return true;
      }
    }
    return false;
  }

  place(cell: number, bit: number): void {
    const value = trailingZeros(bit);
    this.cells[cell] = value;
    this.candidates[cell] = 0;
    for (let peer = 0; peer < 81; peer++) {
      if (this.peers(cell, peer)) {
        this.candidates[peer] &= ~bit;
      }
    }
  }

  single(): boolean {
    // Naked single
    for (let i = 0; i < 81; i++) {
      if (bitCount(this.candidates[i]) === 1) {
        this.place(i, this.candidates[i]);
        return true;
      }
    }
    // Hidden single
    for (const unit of UNITS) {
      for (let value = 1; value <= 9; value++) {
        const bit = 1 << value;
        let found = -1;
        let count = 0;
        for (const cell of unit) {
          if ((this.candidates[cell] & bit) !== 0) {
            found = cell;
            count++;
          }
        }
        if (count === 1) {
          this.place(found, bit);
          return true;
        }
      }
    }
    return false;
  }

  locked(): boolean {
    for (let unitIdx = 0; unitIdx < 27; unitIdx++) {
      const unit = UNITS[unitIdx];
      for (let value = 1; value <= 9; value++) {
        const bit = 1 << value;
        let count = 0;
        let row = -1,
          col = -1,
          box = -1;

        for (const cell of unit) {
          if ((this.candidates[cell] & bit) !== 0) {
            if (count === 0) {
              row = Math.floor(cell / 9);
              col = cell % 9;
              box = boxIndex(cell);
            } else {
              if (row !== Math.floor(cell / 9)) row = -1;
              if (col !== cell % 9) col = -1;
              if (box !== boxIndex(cell)) box = -1;
            }
            count++;
          }
        }

        if (count < 2) continue;

        let changed = false;
        for (let cell = 0; cell < 81; cell++) {
          let eliminate = false;
          if (unitIdx >= 18) {
            // Box unit - eliminate from row/col outside box
            eliminate =
              boxIndex(cell) !== unitIdx - 18 && (Math.floor(cell / 9) === row || cell % 9 === col);
          } else {
            // Row/col unit - eliminate from box outside line
            eliminate =
              box >= 0 &&
              boxIndex(cell) === box &&
              (unitIdx < 9 ? Math.floor(cell / 9) !== unitIdx : cell % 9 !== unitIdx - 9);
          }
          if (eliminate && (this.candidates[cell] & bit) !== 0) {
            this.candidates[cell] &= ~bit;
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
    return false;
  }

  pair(): boolean {
    for (const unit of UNITS) {
      for (const first of unit) {
        const mask = this.candidates[first];
        if (bitCount(mask) !== 2) continue;
        let count = 0;
        for (const cell of unit) {
          if (this.candidates[cell] === mask) count++;
        }
        if (count !== 2) continue;
        let changed = false;
        for (const cell of unit) {
          if (this.candidates[cell] !== mask && (this.candidates[cell] & mask) !== 0) {
            this.candidates[cell] &= ~mask;
            changed = true;
          }
        }
        if (changed) return true;
      }
    }
    return false;
  }
}

export class LogicalSolver {
  solve(board: SudokuBoard, budget?: WorkBudget): LogicalResult {
    if (!isValid(board)) {
      return {
        solved: false,
        difficulty: Difficulty.EASY,
        steps: 0,
        board: new SudokuBoard(board.toArray()),
      };
    }

    const workBudget = budget ?? new WorkBudget(2000, 5000);
    const state = new LogicalState(board);
    let hardest: Difficulty = Difficulty.EASY;
    let steps = 0;

    while (true) {
      workBudget.tick();
      if (state.contradiction()) {
        return { solved: false, difficulty: hardest, steps, board: new SudokuBoard(state.cells) };
      }
      if (state.single()) {
        steps++;
        continue;
      }
      if (state.locked()) {
        if (hardest === Difficulty.EASY) hardest = Difficulty.MEDIUM;
        steps++;
        continue;
      }
      if (state.pair()) {
        hardest = Difficulty.HARD;
        steps++;
        continue;
      }
      const result = new SudokuBoard(state.cells);
      return {
        solved: isComplete(result),
        difficulty: hardest,
        steps,
        board: result,
      };
    }
  }
}

// ============================================================================
// Generator
// ============================================================================

// Verified fallback puzzles (same as BE, seed 0)
const FALLBACKS: Record<Difficulty, { givens: string; solution: string }> = {
  EASY: {
    givens: '705003624342860010900200003690120000803070090204000006438600009079380500006790040',
    solution: '785913624342865917961247853697128435853476291214539786438652179179384562526791348',
  },
  MEDIUM: {
    givens: '700003624000860010900000003600120000000070090204000006438600009009000000000790040',
    solution: '785913624342865917961247853697128435853476291214539786438652179179384562526791348',
  },
  HARD: {
    givens: '700003624000860010000000003600120000000070000204000006438600009009000000000790040',
    solution: '785913624342865917961247853697128435853476291214539786438652179179384562526791348',
  },
};

function parseBoard(s: string): SudokuBoard {
  return SudokuBoard.fromString(s);
}

function relabel(board: SudokuBoard, digits: number[]): SudokuBoard {
  const cells = board.toArray();
  for (let i = 0; i < 81; i++) {
    if (cells[i] !== 0) {
      cells[i] = digits[cells[i] - 1];
    }
  }
  return new SudokuBoard(cells);
}

class SudokuGeneratorImpl {
  private readonly logicalSolver = new LogicalSolver();
  private readonly exactSolver = new SudokuSolver();

  generate(seed: number, difficulty: Difficulty, limits: Limits = DEFAULT_LIMITS): SudokuPuzzle {
    if (
      !Number.isInteger(limits.attempts) ||
      limits.attempts < 0 ||
      limits.attempts > 100 ||
      !Number.isFinite(limits.maxDurationMs) ||
      limits.maxDurationMs < 0 ||
      limits.maxDurationMs > 30_000
    ) {
      throw new Error('Limiti generatore non validi.');
    }
    const budget = WorkBudget.fromLimits(limits);
    const rng = new SeededRNG(seed);

    try {
      for (let attempt = 0; attempt < limits.attempts; attempt++) {
        budget.tick();
        const solution = this.exactSolver.complete(rng, budget);
        const cells = solution.toArray();
        let order = Array.from({ length: 81 }, (_, i) => i);
        order = rng.shuffle(order);

        let clues = 81;
        for (const cell of order) {
          budget.tick();
          const previous = cells[cell];
          cells[cell] = 0;
          const board = new SudokuBoard(cells);
          if (countSolutions(board, 2, budget) !== 1) {
            cells[cell] = previous;
            continue;
          }
          clues--;
          if (clues > 40) continue;
          const rating = this.logicalSolver.solve(board, budget);
          if (rating.solved && rating.difficulty === difficulty) {
            const givensBoard = new SudokuBoard(board.toArray());
            const solBoard = new SudokuBoard(solution.toArray());
            return {
              givens: board.toArray(),
              solution: solution.toArray(),
              difficulty,
              fallback: false,
              verify: () => {
                if (!matchesGivens(givensBoard, solBoard)) throw new Error('Soluzione non valida');
                const exact = this.exactSolver.analyze(givensBoard);
                const logical = this.logicalSolver.solve(givensBoard);
                if (
                  exact.solutionCount !== 1 ||
                  !solBoard.equals(exact.firstSolution!) ||
                  !logical.solved ||
                  logical.difficulty !== difficulty ||
                  !solBoard.equals(logical.board)
                ) {
                  throw new Error('Sudoku non unico o difficoltà non verificata.');
                }
              },
            };
          }
        }
      }
    } catch (e) {
      if (!(e instanceof WorkBudgetExhausted)) throw e;
      // Fall through to fallback
    }

    // Verified fallback with deterministic relabeling per seed
    const fallback = FALLBACKS[difficulty];
    let digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const fallbackRng = new SeededRNG(seed);
    digits = fallbackRng.shuffle(digits);

    const givensBoard = relabel(parseBoard(fallback.givens), digits);
    const solutionBoard = relabel(parseBoard(fallback.solution), digits);

    // Re-verify difficulty after relabeling
    const rating = this.logicalSolver.solve(givensBoard);
    if (rating.solved && rating.difficulty === difficulty) {
      return {
        givens: givensBoard.toArray(),
        solution: solutionBoard.toArray(),
        difficulty,
        fallback: true,
        verify: () => {
          if (!matchesGivens(givensBoard, solutionBoard))
            throw new Error('Fallback soluzione non valida');
          const exact = this.exactSolver.analyze(givensBoard);
          const logical = this.logicalSolver.solve(givensBoard);
          if (
            exact.solutionCount !== 1 ||
            !solutionBoard.equals(exact.firstSolution!) ||
            !logical.solved ||
            logical.difficulty !== difficulty ||
            !solutionBoard.equals(logical.board)
          ) {
            throw new Error('Fallback Sudoku non unico o difficoltà non verificata.');
          }
        },
      };
    }

    // Return original fallback if relabeling changed difficulty (shouldn't happen)
    const originalGivens = parseBoard(fallback.givens);
    const originalSolution = parseBoard(fallback.solution);
    return {
      givens: originalGivens.toArray(),
      solution: originalSolution.toArray(),
      difficulty,
      fallback: true,
      verify: () => {
        if (!matchesGivens(originalGivens, originalSolution))
          throw new Error('Fallback originale non valido');
        const exact = this.exactSolver.analyze(originalGivens);
        const logical = this.logicalSolver.solve(originalGivens);
        if (
          exact.solutionCount !== 1 ||
          !originalSolution.equals(exact.firstSolution!) ||
          !logical.solved ||
          logical.difficulty !== difficulty ||
          !originalSolution.equals(logical.board)
        ) {
          throw new Error('Fallback originale non unico o difficoltà non verificata.');
        }
      },
    };
  }

  /** Internal method for testing with custom budget - uses the provided budget directly, no fallback. */
  generateWithBudget(difficulty: Difficulty, seed: number, budget: WorkBudget): SudokuPuzzle {
    const rng = new SeededRNG(seed);

    try {
      for (let attempt = 0; attempt < 12; attempt++) {
        budget.tick();
        const solution = this.exactSolver.complete(rng, budget);
        const cells = solution.toArray();
        let order = Array.from({ length: 81 }, (_, i) => i);
        order = rng.shuffle(order);

        let clues = 81;
        for (const cell of order) {
          budget.tick();
          const previous = cells[cell];
          cells[cell] = 0;
          const board = new SudokuBoard(cells);
          if (countSolutions(board, 2, budget) !== 1) {
            cells[cell] = previous;
            continue;
          }
          clues--;
          if (clues > 40) continue;
          const rating = this.logicalSolver.solve(board, budget);
          if (rating.solved && rating.difficulty === difficulty) {
            const givensBoard = new SudokuBoard(board.toArray());
            const solBoard = new SudokuBoard(solution.toArray());
            return {
              givens: board.toArray(),
              solution: solution.toArray(),
              difficulty,
              fallback: false,
              verify: () => {
                if (!matchesGivens(givensBoard, solBoard)) throw new Error('Soluzione non valida');
                const exact = this.exactSolver.analyze(givensBoard);
                const logical = this.logicalSolver.solve(givensBoard);
                if (
                  exact.solutionCount !== 1 ||
                  !solBoard.equals(exact.firstSolution!) ||
                  !logical.solved ||
                  logical.difficulty !== difficulty ||
                  !solBoard.equals(logical.board)
                ) {
                  throw new Error('Sudoku non unico o difficoltà non verificata.');
                }
              },
            };
          }
        }
      }
    } catch (e) {
      if (!(e instanceof WorkBudgetExhausted)) throw e;
      // Re-throw for test verification - budget exhausted means no generated puzzle
      throw e;
    }

    // Should not reach here if budget is respected
    throw new WorkBudgetExhausted();
  }
}

export const SudokuGenerator = new SudokuGeneratorImpl();

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a Sudoku puzzle for endless mode.
 * @param difficulty - EASY, MEDIUM, or HARD
 * @param seed - Seed for deterministic generation
 * @param limits - Optional limits for generation (attempts, maxWork, maxDurationMs)
 * @returns Puzzle with givens, solution, difficulty, and fallback flag
 */
export function generate(difficulty: Difficulty, seed: number, limits?: Limits): SudokuPuzzle {
  return SudokuGenerator.generate(seed, difficulty, limits ?? DEFAULT_LIMITS);
}

/** Verifies this payload; never generates a replacement puzzle. Explicit, potentially expensive. */
export function verifyPuzzle(puzzle: SudokuPuzzleDTO): void {
  const givens = new SudokuBoard(puzzle.givens);
  const solution = new SudokuBoard(puzzle.solution);
  if (!matchesGivens(givens, solution)) throw new Error('Soluzione non valida.');
  const exact = new SudokuSolver().analyze(givens);
  const logical = new LogicalSolver().solve(givens);
  if (
    exact.solutionCount !== 1 ||
    !exact.firstSolution?.equals(solution) ||
    !logical.solved ||
    logical.difficulty !== puzzle.difficulty ||
    !logical.board.equals(solution)
  ) {
    throw new Error('Sudoku non unico o difficoltà non verificata.');
  }
}
