import { SeededRNG } from './seeded-rng';
import { WorkBudget } from './work-budget';
import { LogicalSolver, Difficulty } from './logical-solver';

export interface SudokuBoard {
  readonly cells: readonly number[];
  get(row: number, col: number): number;
  isValid(): boolean;
  isComplete(): boolean;
  candidates(cell: number): number[];
  toString(): string;
}

export class SudokuBoardImpl implements SudokuBoard {
  readonly cells: readonly number[];

  constructor(cells: number[]) {
    this.cells = SudokuBoardImpl.validateCells(cells);
  }

  static validateCells(cells: number[]): number[] {
    if (cells.length !== 81) {
      throw new Error('Board must have exactly 81 cells');
    }
    for (let i = 0; i < 81; i++) {
      const val = cells[i];
      if (val < 0 || val > 9 || !Number.isInteger(val)) {
        throw new Error(`Invalid cell value at position ${i}: ${val}`);
      }
    }
    return [...cells];
  }

  get(row: number, col: number): number {
    return this.cells[row * 9 + col];
  }

  isValid(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const val = this.get(row, col);
        if (val === 0) continue;
        if (!this.isValidPosition(row, col, val)) {
          return false;
        }
      }
    }
    return true;
  }

  isComplete(): boolean {
    return this.cells.every(cell => cell !== 0);
  }

  candidates(cell: number): number[] {
    if (this.cells[cell] !== 0) {
      return [this.cells[cell]];
    }

    const row = Math.floor(cell / 9);
    const col = cell % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const used = new Set<number>();

    for (let i = 0; i < 81; i++) {
      if (this.cells[i] === 0) continue;
      const r = Math.floor(i / 9);
      const c = i % 9;
      if (r === row || c === col || Math.floor(r / 3) === Math.floor(box / 3)) {
        used.add(this.cells[i]);
      }
    }

    return Array.from({ length: 9 }, (_, i) => i + 1).filter(num => !used.has(num));
  }

  private isValidPosition(row: number, col: number, val: number): boolean {
    for (let c = 0; c < 9; c++) {
      if (this.get(row, c) === val) return false;
    }
    for (let r = 0; r < 9; r++) {
      if (this.get(r, col) === val) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (this.get(r, c) === val) return false;
      }
    }
    return true;
  }

  toString(): string {
    return this.cells.map(cell => (cell === 0 ? '.' : cell.toString())).join('');
  }

  fromString(str: string): SudokuBoardImpl {
    const cells = str.split('').map(char => char === '.' ? 0 : parseInt(char));
    return new SudokuBoardImpl(cells);
  }
}

export class SudokuGenerator {
  private readonly attempts = 12;
  private readonly maxWork = 250000;
  private readonly maxTime = 500;

  constructor(
    private rng: SeededRNG,
    private budget: WorkBudget
  ) {}

  generate(difficulty: Difficulty, seed: number): { givens: number[]; solution: number[] } {
    this.rng = new SeededRNG(seed);
    this.budget.reset();

    for (let attempt = 0; attempt < this.attempts; attempt++) {
      const shuffledDifficulty = this.rng.nextRange(3);
      const puzzle = this.generateDifficulty(difficulty);
      if (this.isValidPuzzle(puzzle)) {
        return {
          givens: [...puzzle],
          solution: this.solvePuzzle(puzzle)
        };
      }
    }

    throw new Error('Unable to generate puzzle after all attempts');
  }

  private generateDifficulty(difficulty: Difficulty): number[] {
    const puzzle: number[] = new Array(81).fill(0);
    const solution: number[] = new Array(81).fill(0);

    const placeFirstNumber = () => {
      const cell = this.rng.nextRange(81);
      puzzle[cell] = this.rng.nextRange(9) + 1;
    };

    const solveWithBudget = (maxWork: number, maxTime: number): boolean => {
      const board = new SudokuBoardImpl([...puzzle]);
      const result = LogicalSolver.solve(board, maxWork, maxTime, Date.now());
      if (result) {
        for (let i = 0; i < 81; i++) {
          solution[i] = board.cells[i];
        }
      }
      return result;
    };

    placeFirstNumber();
    let startTime = Date.now();

    if (!solveWithBudget(this.budget.workRemaining, this.budget.timeRemaining)) {
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

  private calculateGivensToRemove(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'EASY': return 30;
      case 'MEDIUM': return 40;
      case 'HARD': return 45;
      default: return 35;
    }
  }

  private isValidPuzzle(puzzle: number[]): boolean {
    const board = new SudokuBoardImpl([...puzzle]);
    return this.countSolutions(board) === 1;
  }

  private solvePuzzle(puzzle: number[]): number[] {
    const board = new SudokuBoardImpl([...puzzle]);
    LogicalSolver.solve(board, this.budget.workRemaining, this.budget.timeRemaining, Date.now());
    return board.cells;
  }

  private countSolutions(board: SudokuBoard): number {
    return this.countSolutionsWithBudget(board, this.budget.workRemaining, this.budget.timeRemaining);
  }

  private countSolutionsWithBudget(
    board: SudokuBoard,
    maxWork: number,
    maxTime: number,
    startTime: number = Date.now()
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
        count += this.countSolutionsWithBudget(board, maxWork - workTime, maxTime - 1, startTime + 1);
      }
      board.cells[emptyCell] = 0;
    }

    return count;
  }
}

export class SudokuEngine {
  constructor(
    private budget: WorkBudget,
    private rng: SeededRNG
  ) {}

  generate(difficulty: Difficulty, seed: number): { givens: number[]; solution: number[] } {
    const generator = new SudokuGenerator(this.rng, this.budget);
    return generator.generate(difficulty, seed);
  }

  solve(board: SudokuBoard): number[] | null {
    const solution = new Array(81).fill(0);
    const result = LogicalSolver.solve(board, this.budget.workRemaining, this.budget.timeRemaining, Date.now());
    if (result) {
      return solution;
    }
    return null;
  }

  countSolutions(board: SudokuBoard, max: number = 2): number {
    return this.countSolutionsWithBudget(board, max, 86400000);
  }

  private countSolutionsWithBudget(
    board: SudokuBoard,
    maxWork: number,
    maxTime: number,
    startTime: number = Date.now()
  ): number {
    const generator = new SudokuGenerator(this.rng, this.budget);
    return generator.countSolutionsWithBudget(board, maxWork, maxTime, startTime);
  }

  isValid(board: SudokuBoard): boolean {
    return board.isValid();
  }

  isComplete(board: SudokuBoard): boolean {
    return board.isComplete();
  }
}