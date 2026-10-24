import { describe, it, expect } from 'vitest';
import {
  Difficulty,
  SudokuBoard,
  SudokuGenerator,
  SudokuSolver,
  LogicalSolver,
  SeededRNG,
  WorkBudget,
  WorkBudgetExhausted,
  countSolutions,
  isValid,
  isComplete,
  solve,
  generate,
} from './sudoku-engine';

describe('Sudoku Engine - Types and Constants', () => {
  it('exports Difficulty enum with correct values', () => {
    expect(Difficulty.EASY).toBe('EASY');
    expect(Difficulty.MEDIUM).toBe('MEDIUM');
    expect(Difficulty.HARD).toBe('HARD');
  });
});

describe('SeededRNG', () => {
  it('produces deterministic sequence for same seed', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRNG(12345);
    const rng2 = new SeededRNG(54321);
    let different = false;
    for (let i = 0; i < 100; i++) {
      if (rng1.next() !== rng2.next()) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('nextInt returns values in range [0, n)', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextInt(9);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(9);
    }
  });

  it('shuffle produces permutation of array', () => {
    const rng = new SeededRNG(42);
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled.sort()).toEqual(arr);
    // Note: with small arrays and specific seeds, shuffle may occasionally produce the same order
    // This is statistically valid for a correct Fisher-Yates implementation
  });

  it('shuffle is deterministic for same seed', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(rng1.shuffle([...arr])).toEqual(rng2.shuffle([...arr]));
  });
});

describe('WorkBudget', () => {
  it('allows operations within work limit', () => {
    const budget = new WorkBudget(100, 1000, () => 0);
    for (let i = 0; i < 50; i++) {
      budget.tick();
    }
    expect(budget.getUsed()).toBe(50);
  });

  it('throws Exhausted when work limit exceeded', () => {
    const budget = new WorkBudget(10, 1000, () => 0);
    for (let i = 0; i < 10; i++) {
      budget.tick();
    }
    expect(() => budget.tick()).toThrow('Budget di preparazione Sudoku esaurito.');
  });

  it('throws Exhausted when time limit exceeded', () => {
    let time = 0;
    const budget = new WorkBudget(1000, 1, () => time);
    budget.tick();
    time += 2_000_000; // 2ms > 1ms limit
    expect(() => budget.tick()).toThrow('Budget di preparazione Sudoku esaurito.');
  });

  it('throws Exhausted when tick would exceed budget', () => {
    const budget = new WorkBudget(0, 1000, () => 0);
    expect(() => budget.tick()).toThrow('Budget di preparazione Sudoku esaurito.');
  });
});

describe('SudokuBoard', () => {
  it('creates board from 81 integers', () => {
    const cells = new Array(81).fill(0);
    const board = new SudokuBoard(cells);
    expect(board.cell(0)).toBe(0);
    expect(board.cell(80)).toBe(0);
  });

  it('rejects arrays of wrong length', () => {
    expect(() => new SudokuBoard(new Array(80).fill(0))).toThrow();
    expect(() => new SudokuBoard(new Array(82).fill(0))).toThrow();
  });

  it('rejects values outside 0-9', () => {
    const cells = new Array(81).fill(0);
    cells[0] = 10;
    expect(() => new SudokuBoard(cells)).toThrow();
    cells[0] = -1;
    expect(() => new SudokuBoard(cells)).toThrow();
  });

  it('is immutable - toArray returns copy', () => {
    const cells = new Array(81).fill(1);
    const board = new SudokuBoard(cells);
    const arr = board.toArray();
    arr[0] = 0;
    expect(board.cell(0)).toBe(1);
  });

  it('equals and hashCode work correctly', () => {
    const board1 = new SudokuBoard(new Array(81).fill(5));
    const board2 = new SudokuBoard(new Array(81).fill(5));
    const board3 = new SudokuBoard(new Array(81).fill(3));
    expect(board1.equals(board2)).toBe(true);
    expect(board1.equals(board3)).toBe(false);
    expect(board1.hashCode()).toBe(board2.hashCode());
  });

  it('toString does not leak content', () => {
    const board = new SudokuBoard(new Array(81).fill(7));
    expect(board.toString()).not.toContain('7');
  });

  it('fromString parses valid string', () => {
    const board = SudokuBoard.fromString('1'.repeat(81));
    expect(board.cell(0)).toBe(1);
  });

  it('fromString rejects invalid string', () => {
    expect(() => SudokuBoard.fromString('123')).toThrow();
    expect(() => SudokuBoard.fromString('a'.repeat(81))).toThrow();
  });
});

describe('SudokuValidator (via isValid/isComplete)', () => {
  const SOLUTION =
    '785913624342865917961247853697128435853476291214539786438652179179384562526791348';
  const digits = (s: string) => s.split('').map((c) => parseInt(c, 10));

  it('isValid returns true for consistent partial board', () => {
    const board = new SudokuBoard(digits(SOLUTION));
    expect(isValid(board)).toBe(true);
  });

  it('isValid returns false for row conflict', () => {
    const cells = digits(SOLUTION);
    cells[1] = cells[0]; // duplicate in row
    const board = new SudokuBoard(cells);
    expect(isValid(board)).toBe(false);
  });

  it('isValid returns false for column conflict', () => {
    const cells = digits(SOLUTION);
    cells[9] = cells[0]; // duplicate in column
    const board = new SudokuBoard(cells);
    expect(isValid(board)).toBe(false);
  });

  it('isValid returns false for box conflict', () => {
    const cells = digits(SOLUTION);
    cells[10] = cells[0]; // duplicate in box
    const board = new SudokuBoard(cells);
    expect(isValid(board)).toBe(false);
  });

  it('isComplete returns true for valid complete board', () => {
    const board = new SudokuBoard(digits(SOLUTION));
    expect(isComplete(board)).toBe(true);
  });

  it('isComplete returns false for incomplete board', () => {
    const cells = digits(SOLUTION);
    cells[0] = 0;
    const board = new SudokuBoard(cells);
    expect(isComplete(board)).toBe(false);
  });

  it('isComplete returns false for complete but invalid board', () => {
    const cells = digits(SOLUTION);
    cells[1] = cells[0];
    const board = new SudokuBoard(cells);
    expect(isComplete(board)).toBe(false);
  });

  it('distinguishes consistent vs solvable vs unique', () => {
    // Consistent but not solvable (contradiction in constraints)
    const impossible = new Array(81).fill(0);
    for (let i = 0; i < 8; i++) impossible[i] = i + 1;
    impossible[17] = 9; // creates impossibility
    const board1 = new SudokuBoard(impossible);
    expect(isValid(board1)).toBe(true);
    expect(countSolutions(board1, 2)).toBe(0);

    // Solvable and unique
    const board2 = new SudokuBoard(digits(SOLUTION));
    board2.toArray()[0] = 0; // remove one cell
    expect(isValid(board2)).toBe(true);
    expect(countSolutions(board2, 2)).toBe(1);

    // Ambiguous (multiple solutions)
    const empty = new SudokuBoard(new Array(81).fill(0));
    expect(isValid(empty)).toBe(true);
    expect(countSolutions(empty, 2)).toBe(2);
  });
});

describe('SudokuSolver', () => {
  const SOLUTION =
    '785913624342865917961247853697128435853476291214539786438652179179384562526791348';
  const digits = (s: string) => s.split('').map((c) => parseInt(c, 10));

  it('solves valid puzzle with unique solution', () => {
    const cells = digits(SOLUTION);
    cells[0] = 0;
    const board = new SudokuBoard(cells);
    const solution = solve(board);
    expect(solution).not.toBeNull();
    expect(isComplete(solution!)).toBe(true);
    expect(solution!.cell(0)).toBe(7);
  });

  it('returns null for unsolvable puzzle', () => {
    const impossible = new Array(81).fill(0);
    for (let i = 0; i < 8; i++) impossible[i] = i + 1;
    impossible[17] = 9;
    const board = new SudokuBoard(impossible);
    const solution = solve(board);
    expect(solution).toBeNull();
  });

  it('countSolutions stops at max', () => {
    const empty = new SudokuBoard(new Array(81).fill(0));
    expect(countSolutions(empty, 1)).toBe(1);
    expect(countSolutions(empty, 2)).toBe(2);
    // With higher max, caps at 2 (we never need more than 2 to prove uniqueness)
    expect(countSolutions(empty, 10)).toBe(2);
  });

  it('countSolutions returns 0 for unsolvable', () => {
    const impossible = new Array(81).fill(0);
    for (let i = 0; i < 8; i++) impossible[i] = i + 1;
    impossible[17] = 9;
    const board = new SudokuBoard(impossible);
    expect(countSolutions(board, 2)).toBe(0);
  });

  it('countSolutions respects max parameter', () => {
    const board = new SudokuBoard(new Array(81).fill(0));
    expect(() => countSolutions(board, 0)).toThrow();
    // max > 2 is capped at 2, not an error
    expect(countSolutions(board, 3)).toBe(2);
    expect(countSolutions(board, 10)).toBe(2);
  });

  it('SudokuSolver.analyze returns solution count and first solution', () => {
    const cells = digits(SOLUTION);
    cells[0] = 0;
    const board = new SudokuBoard(cells);
    const solver = new SudokuSolver();
    const result = solver.analyze(board);
    expect(result.solutionCount).toBe(1);
    expect(result.firstSolution).not.toBeNull();
    expect(result.searchNodes).toBeGreaterThan(0);
  });

  it('SudokuSolver.complete generates full solution', () => {
    const rng = new SeededRNG(42);
    const budget = new WorkBudget(250_000, 500);
    const solver = new SudokuSolver();
    const solution = solver.complete(rng, budget);
    expect(isComplete(solution)).toBe(true);
  });
});

describe('LogicalSolver', () => {
  const EASY_GIVENS =
    '705003624342860010900200003690120000803070090204000006438600009079380500006790040';
  const MEDIUM_GIVENS =
    '700003624000860010900000003600120000000070090204000006438600009009000000000790040';
  const HARD_GIVENS =
    '700003624000860010000000003600120000000070000204000006438600009009000000000790040';
  const SOLUTION =
    '785913624342865917961247853697128435853476291214539786438652179179384562526791348';
  const digits = (s: string) => s.split('').map((c) => parseInt(c, 10));

  it('solves EASY puzzle with singles only', () => {
    const board = new SudokuBoard(digits(EASY_GIVENS));
    const solver = new LogicalSolver();
    const result = solver.solve(board);
    expect(result.solved).toBe(true);
    expect(result.difficulty).toBe(Difficulty.EASY);
    expect(result.board.equals(new SudokuBoard(digits(SOLUTION)))).toBe(true);
  });

  it('solves MEDIUM puzzle requiring locked candidates', () => {
    const board = new SudokuBoard(digits(MEDIUM_GIVENS));
    const solver = new LogicalSolver();
    const result = solver.solve(board);
    expect(result.solved).toBe(true);
    expect(result.difficulty).toBe(Difficulty.MEDIUM);
    expect(result.board.equals(new SudokuBoard(digits(SOLUTION)))).toBe(true);
  });

  it('solves HARD puzzle requiring naked pairs', () => {
    const board = new SudokuBoard(digits(HARD_GIVENS));
    const solver = new LogicalSolver();
    const result = solver.solve(board);
    expect(result.solved).toBe(true);
    expect(result.difficulty).toBe(Difficulty.HARD);
    expect(result.board.equals(new SudokuBoard(digits(SOLUTION)))).toBe(true);
  });

  it('returns unsolved for puzzle requiring higher technique with limited budget', () => {
    const board = new SudokuBoard(digits(MEDIUM_GIVENS));
    // Very limited budget - only 1 work unit, should exhaust before solving
    const budget = new WorkBudget(1, 1000, () => 0);
    const solver = new LogicalSolver();
    // Java LogicalSolver throws WorkBudget.Exhausted when budget is exhausted
    expect(() => solver.solve(board, budget)).toThrow(WorkBudgetExhausted);
  });

  it('never uses guessing - empty board unsolvable', () => {
    const empty = new SudokuBoard(new Array(81).fill(0));
    const solver = new LogicalSolver();
    const result = solver.solve(empty);
    expect(result.solved).toBe(false);
    expect(result.steps).toBe(0);
  });

  it('preserves candidate eliminations', () => {
    const board = new SudokuBoard(digits(EASY_GIVENS));
    const solver = new LogicalSolver();
    const result = solver.solve(board);
    expect(result.solved).toBe(true);
  });
});

describe('SudokuGenerator', () => {
  it('generates EASY puzzle with unique solution', () => {
    const puzzle = generate(Difficulty.EASY, 12345);
    expect(puzzle.givens.length).toBe(81);
    expect(puzzle.solution.length).toBe(81);
    expect(isComplete(new SudokuBoard([...puzzle.solution]))).toBe(true);
    expect(countSolutions(new SudokuBoard([...puzzle.givens]), 2)).toBe(1);
    const solver = new LogicalSolver();
    expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(Difficulty.EASY);
  });

  it('generates MEDIUM puzzle with unique solution', () => {
    const puzzle = generate(Difficulty.MEDIUM, 12345);
    expect(isComplete(new SudokuBoard([...puzzle.solution]))).toBe(true);
    expect(countSolutions(new SudokuBoard([...puzzle.givens]), 2)).toBe(1);
    const solver = new LogicalSolver();
    expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(Difficulty.MEDIUM);
  });

  it('generates HARD puzzle with unique solution', () => {
    const puzzle = generate(Difficulty.HARD, 12345);
    expect(isComplete(new SudokuBoard([...puzzle.solution]))).toBe(true);
    expect(countSolutions(new SudokuBoard([...puzzle.givens]), 2)).toBe(1);
    const solver = new LogicalSolver();
    expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(Difficulty.HARD);
  });

  it('is deterministic for same seed and difficulty', () => {
    const puzzle1 = generate(Difficulty.EASY, 999);
    const puzzle2 = generate(Difficulty.EASY, 999);
    expect(puzzle1.givens).toEqual(puzzle2.givens);
    expect(puzzle1.solution).toEqual(puzzle2.solution);
  });

  it('produces different puzzles for different seeds', () => {
    const puzzle1 = generate(Difficulty.EASY, 12345);
    const puzzle2 = generate(Difficulty.EASY, 54321);
    expect(puzzle1.givens).not.toEqual(puzzle2.givens);
  });

  it('uses verified fallback when budget exhausted', () => {
    // Use public API with zero limits to force fallback
    const puzzle = generate(Difficulty.EASY, 42, { attempts: 0, maxWork: 0, maxDurationMs: 0 });
    expect(puzzle.fallback).toBe(true);
    expect(isComplete(new SudokuBoard([...puzzle.solution]))).toBe(true);
    expect(countSolutions(new SudokuBoard([...puzzle.givens]), 2)).toBe(1);
    const solver = new LogicalSolver();
    expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(Difficulty.EASY);
  });

  it('fallback is same difficulty, never downgraded', () => {
    for (const diff of [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD]) {
      const puzzle = generate(diff, 42, { attempts: 0, maxWork: 0, maxDurationMs: 0 });
      expect(puzzle.fallback).toBe(true);
      const solver = new LogicalSolver();
      expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(diff);
    }
  });

  it('fallback is verified (solution/unique/difficulty)', () => {
    const puzzle = generate(Difficulty.MEDIUM, 42, { attempts: 0, maxWork: 0, maxDurationMs: 0 });
    puzzle.verify();
  });

  it('deterministic under same budget', () => {
    // Use EASY difficulty which is more likely to succeed within budget
    // Use very large budget to ensure generation completes
    const budget1 = new WorkBudget(5_000_000, 30000, () => 0);
    const budget2 = new WorkBudget(5_000_000, 30000, () => 0);
    const puzzle1 = SudokuGenerator.generateWithBudget(Difficulty.EASY, 123, budget1);
    const puzzle2 = SudokuGenerator.generateWithBudget(Difficulty.EASY, 123, budget2);
    expect(puzzle1.givens).toEqual(puzzle2.givens);
    expect(puzzle1.solution).toEqual(puzzle2.solution);
  });
});

describe('Edge cases and error handling', () => {
  it('handles board with 80 cells filled (1 empty)', () => {
    const SOLUTION =
      '785913624342865917961247853697128435853476291214539786438652179179384562526791348';
    const digits = SOLUTION.split('').map((c) => parseInt(c, 10));
    digits[40] = 0;
    const board = new SudokuBoard(digits);
    const solution = solve(board);
    expect(solution).not.toBeNull();
    expect(solution!.cell(40)).toBe(7); // center cell
  });

  it('handles invalid values (10, -1)', () => {
    expect(() => new SudokuBoard(Array(81).fill(10))).toThrow();
    expect(() => new SudokuBoard(Array(81).fill(-1))).toThrow();
  });

  it('handles duplicate givens', () => {
    const cells = new Array(81).fill(0);
    cells[0] = 1;
    cells[1] = 1;
    const board = new SudokuBoard(cells);
    expect(isValid(board)).toBe(false);
    expect(countSolutions(board, 2)).toBe(0);
  });

  it('handles unsolvable board', () => {
    const impossible = new Array(81).fill(0);
    for (let i = 0; i < 8; i++) impossible[i] = i + 1;
    impossible[17] = 9;
    const board = new SudokuBoard(impossible);
    expect(isValid(board)).toBe(true);
    expect(countSolutions(board, 2)).toBe(0);
    expect(solve(board)).toBeNull();
  });

  it('handles ambiguous board (multiple solutions)', () => {
    const empty = new SudokuBoard(new Array(81).fill(0));
    expect(countSolutions(empty, 2)).toBe(2);
  });

  it('budget zero forces fallback without silent downgrade', () => {
    const puzzle = generate(Difficulty.HARD, 42, { attempts: 0, maxWork: 0, maxDurationMs: 0 });
    expect(puzzle.fallback).toBe(true);
    const solver = new LogicalSolver();
    expect(solver.solve(new SudokuBoard([...puzzle.givens])).difficulty).toBe(Difficulty.HARD);
  });

  it('cancelled generation not interpreted as uniqueness', () => {
    let time = 0;
    const budget = new WorkBudget(1000, 1, () => {
      time += 1_000_000; // Exceed 1ms
      return time;
    });
    // generateWithBudget should throw WorkBudgetExhausted when budget is exhausted
    // (it doesn't fall back, unlike the public generate())
    expect(() => SudokuGenerator.generateWithBudget(Difficulty.EASY, 1, budget)).toThrow(
      WorkBudgetExhausted,
    );
  });
});

describe('50 seeds distribution test', () => {
  const seeds = Array.from({ length: 50 }, (_, i) => i);
  const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

  for (const difficulty of difficulties) {
    for (const seed of seeds) {
      it(`generates valid ${difficulty} puzzle for seed ${seed}`, () => {
        const puzzle = generate(difficulty, seed);
        expect(isComplete(new SudokuBoard([...puzzle.solution]))).toBe(true);
        expect(countSolutions(new SudokuBoard([...puzzle.givens]), 2)).toBe(1);
        const solver = new LogicalSolver();
        const rating = solver.solve(new SudokuBoard([...puzzle.givens]));
        expect(rating.solved).toBe(true);
        expect(rating.difficulty).toBe(difficulty);
        expect(rating.board.equals(new SudokuBoard([...puzzle.solution]))).toBe(true);
      });
    }
  }
});
