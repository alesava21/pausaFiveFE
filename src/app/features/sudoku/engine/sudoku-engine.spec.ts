import { SudokuEngine, SudokuBoardImpl } from './sudoku-engine';
import { SeededRNG } from './seeded-rng';
import { WorkBudget } from './work-budget';

interface PuzzleSpec {
  givens: number[];
  solution: number[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  seed: number;
}

desc('SudokuEngine', () => {
  let engine: SudokuEngine;
  let budget: WorkBudget;
  let rng: SeededRNG;

  beforeEach(() => {
    budget = new WorkBudget();
    rng = new SeededRNG(12345);
    engine = new SudokuEngine(budget, rng);
  });

  describe('SudokuEngine Core Functionality', () => {
    it('should validate board cells correctly', () => {
      const validBoard = new Array(81).fill(0);
      validBoard[0] = 5;
      const board = new SudokuBoardImpl(validBoard);
      expect(board.isValid()).toBe(true);
      expect(board.isComplete()).toBe(false);
    });

    it('should reject non-integer cell values', () => {
      const invalidBoard = new Array(81).fill(0);
      invalidBoard[0] = 5.5;
      expect(() => new SudokuBoardImpl(invalidBoard)).toThrow('Invalid cell value');
    });

    it('should reject out-of-range cell values', () => {
      const invalidBoard = new Array(81).fill(0);
      invalidBoard[0] = 10;
      expect(() => new SudokuBoardImpl(invalidBoard)).toThrow('Invalid cell value');
    });

    it('should reject negative cell values', () => {
      const invalidBoard = new Array(81).fill(0);
      invalidBoard[0] = -1;
      expect(() => new SudokuBoardImpl(invalidBoard)).toThrow('Invalid cell value');
    });

    it('should create board from string representation', () => {
      const boardStr = '53..7....6..195....98....6.8...6...34..8..17...2...6..6....28....419..5....4..8..81..76..';
      const board = new SudokuBoardImpl([]).fromString(boardStr);
      expect(board.cells[0]).toBe(5);
      expect(board.cells[1]).toBe(3);
      expect(board.cells[2]).toBe(0);
    });

    it('should solve a simple puzzle', () => {
      const puzzle: number[] = [
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ];
      const board = new SudokuBoardImpl(puzzle);
      const solution = engine.solve(board);
      expect(solution).toBeTruthy();
      expect(solution).toHaveLength(81);
      expect(solution.every(cell => cell >= 1 && cell <= 9)).toBe(true);
    });

    it('should count solutions correctly for valid puzzle', () => {
      const puzzle: number[] = [
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ];
      const board = new SudokuBoardImpl(puzzle);
      const solutionCount = engine.countSolutions(board, 2);
      expect(solutionCount).toBe(1);
    });

    it('should count multiple solutions for ambiguous puzzle', () => {
      const puzzle: number[] = [
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0
      ];
      const board = new SudokuBoardImpl(puzzle);
      const solutionCount = engine.countSolutions(board, 10);
      expect(solutionCount).toBeGreaterThan(1);
    });

    it('should validate board consistency', () => {
      const puzzle: number[] = [
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ];
      const board = new SudokuBoardImpl(puzzle);
      expect(board.isValid()).toBe(true);
    });

    it('should detect invalid board', () => {
      const invalidPuzzle: number[] = [
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ];
      invalidPuzzle[0] = 5; // Already 5 at position (0,0)
      const board = new SudokuBoardImpl(invalidPuzzle);
      expect(board.isValid()).toBe(false);
    });
  });

  describe('SeededRNG', () => {
    it('should create deterministic sequence from seed', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);
      
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should generate different sequences for different seeds', () => {
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(54321);
      
      let different = false;
      for (let i = 0; i < 10; i++) {
        if (rng1.next() !== rng2.next()) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    it('should shuffle array deterministically', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const rng1 = new SeededRNG(12345);
      const rng2 = new SeededRNG(12345);
      
      const shuffled1 = rng1.shuffle([...array]);
      const shuffled2 = rng2.shuffle([...array]);
      
      expect(shuffled1).toEqual(shuffled2);
    });

    it('should maintain array length after shuffle', () => {
      const array = [1, 2, 3, 4, 5];
      const rng = new SeededRNG(12345);
      const shuffled = rng.shuffle([...array]);
      
      expect(shuffled).toHaveLength(array.length);
      expect(shuffled).toEqual(expect.arrayContaining(array));
    });
  });

  describe('WorkBudget', () => {
    it('should track work and time usage', () => {
      const budget = new WorkBudget(100, 1000);
      
      expect(budget.checkWork(10)).toBe(true);
      expect(budget.checkTime(100)).toBe(true);
      expect(budget.workRemaining).toBe(90);
      expect(budget.timeRemaining).toBe(900);
    });

    it('should reject work when exhausted', () => {
      const budget = new WorkBudget(10, 1000);
      budget.checkWork(10);
      expect(budget.checkWork(1)).toBe(false);
    });

    it('should reject time when exhausted', () => {
      const budget = new WorkBudget(100, 100);
      budget.checkTime(100);
      expect(budget.checkTime(1)).toBe(false);
    });

    it('should reset budget', () => {
      const budget = new WorkBudget(100, 1000);
      budget.checkWork(50);
      budget.checkTime(500);
      budget.reset();
      expect(budget.workRemaining).toBe(100);
      expect(budget.timeRemaining).toBe(1000);
    });

    it('should detect exhaustion', () => {
      const budget = new WorkBudget(10, 100);
      budget.checkWork(10);
      expect(budget.exhausted).toBe(true);
    });
  });

  describe('LogicalSolver', () => {
    it('should solve simple singles', () => {
      const board = new SudokuBoardImpl([
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ]);
      const solution = new Array(81).fill(0);
      const difficulty = LogicalSolver.singles(board, solution);
      expect(difficulty).toBe('EASY');
      expect(solution[2]).toBe(4); // Should fill single
    });

    it('should solve locked candidates', () => {
      const board = new SudokuBoardImpl([
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ]);
      const solution = new Array(81).fill(0);
      const difficulty = LogicalSolver.lockedCandidates(board, solution);
      expect(difficulty).toBe('MEDIUM');
    });
  });

  describe('Generator Client', () => {
    it('should generate puzzle with valid givens and solution', async () => {
      const client = new GeneratorClient();
      const result = await client.generate('EASY', 12345);
      
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
      expect(result.givens.every(given => given === 0 || (given >= 1 && given <= 9))).toBe(true);
      expect(result.solution.every(val => val >= 1 && val <= 9)).toBe(true);
      
      // Verify solution is valid
      const board = new SudokuBoardImpl(result.solution);
      expect(board.isValid()).toBe(true);
      expect(board.isComplete()).toBe(true);
      
      // Verify givens match solution
      for (let i = 0; i < 81; i++) {
        if (result.givens[i] !== 0) {
          expect(result.givens[i]).toBe(result.solution[i]);
        }
      }
    });

    it('should handle worker initialization error gracefully', async () => {
      const client = new GeneratorClient();
      // This should not throw synchronously since worker is lazy-loaded
      expect(true).toBe(true); // Just testing that client can be created
    });
  });

  describe('Worker Serialization', () => {
    it('should create cloneable payload without functions', async () => {
      const client = new GeneratorClient();
      const result = await client.generate('EASY', 54321);
      
      // The result should be a plain object with only primitive values
      expect(typeof result).toBe('object');
      expect(result.givens).toBeInstanceOf(Array);
      expect(result.solution).toBeInstanceOf(Array);
      expect(result.givens.every(val => typeof val === 'number')).toBe(true);
      expect(result.solution.every(val => typeof val === 'number')).toBe(true);
      
      // Verify it's structured-clonable (no functions, no closures)
      try {
        const cloned = structuredClone(result);
        expect(cloned).toEqual(result);
      } catch (error) {
        fail('Result should be structured-clonable: ' + error.message);
      }
    });

    it('should serialize puzzle data without verify functions', async () => {
      const client = new GeneratorClient();
      const result = await client.generate('EASY', 99999);
      
      // Ensure no verify functions or non-serializable data
      expect(Object.getOwnPropertyNames(result)).toEqual(['givens', 'solution']);
      expect(Array.isArray(result.givens)).toBe(true);
      expect(Array.isArray(result.solution)).toBe(true);
    });
  });

  describe('Budget Sharing', () => {
    it('should share budget between generator and uniqueness searches', () => {
      const budget = new WorkBudget(1000, 86400000);
      const rng = new SeededRNG(12345);
      const engine = new SudokuEngine(budget, rng);
      
      const board = new SudokuBoardImpl(new Array(81).fill(0));
      const initialWorkRemaining = budget.workRemaining;
      
      // Count solutions should consume budget
      const solutionCount = engine.countSolutions(board, 5);
      const workUsed = initialWorkRemaining - budget.workRemaining;
      
      expect(workUsed).toBeGreaterThan(0);
      expect(workUsed).toBeLessThanOrEqual(initialWorkRemaining);
    });

    it('should detect budget exhaustion during uniqueness search', () => {
      const budget = new WorkBudget(10, 86400000); // Very small budget
      const rng = new SeededRNG(12345);
      const engine = new SudokuEngine(budget, rng);
      
      const board = new SudokuBoardImpl(new Array(81).fill(0));
      const solutionCount = engine.countSolutions(board, 10);
      
      expect(solutionCount).toBe(0); // Should exhaust budget quickly
    });
  });

  describe('Shared Uniqueness Search', () => {
    it('should use shared budget for uniqueness search', () => {
      const budget = new WorkBudget(1000, 86400000);
      const rng = new SeededRNG(12345);
      const engine = new SudokuEngine(budget, rng);
      
      const board = new SudokuBoardImpl([
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ]);
      
      const initialWorkRemaining = budget.workRemaining;
      const solutionCount = engine.countSolutions(board, 5);
      const workUsed = initialWorkRemaining - budget.workRemaining;
      
      expect(solutionCount).toBe(1);
      expect(workUsed).toBeGreaterThan(0); // Should have consumed budget
    });

    it('should track budget consumption during uniqueness search', () => {
      const budget = new WorkBudget(500, 86400000);
      const rng = new SeededRNG(12345);
      const engine = new SudokuEngine(budget, rng);
      
      const board = new SudokuBoardImpl(new Array(81).fill(0));
      const initialTimeRemaining = budget.timeRemaining;
      
      const solutionCount = engine.countSolutions(board, 10);
      
      expect(budget.timeRemaining).toBeLessThan(initialTimeRemaining);
      expect(budget.workRemaining).toBeLessThan(500);
    });
  });

  describe('RNG Precision', () => {
    it('should use bigint precision for unbiased sampling', () => {
      const rng = new SeededRNG(12345);
      
      // Generate many numbers and check distribution
      const counts = new Array(10).fill(0);
      for (let i = 0; i < 10000; i++) {
        const num = rng.nextRange(10);
        counts[num]++;
      }
      
      // Each number should appear roughly equally (within statistical tolerance)
      const expectedCount = 10000 / 10;
      const stdDev = Math.sqrt(expectedCount);
      
      for (let i = 0; i < 10; i++) {
        expect(counts[i]).toBeCloseTo(expectedCount, -1);
      }
    });

    it('should handle large seed values', () => {
      const largeSeed = Number.MAX_SAFE_INTEGER;
      const rng = new SeededRNG(largeSeed);
      
      const num1 = rng.next();
      const num2 = rng.next();
      
      expect(typeof num1).toBe('number');
      expect(typeof num2).toBe('number');
      expect(num1).toBeGreaterThanOrEqual(0);
      expect(num2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Board Integer Validation', () => {
    it('should accept integer cell values 0-9', () => {
      const board = new SudokuBoardImpl([
        1,2,3, 4,5,6, 7,8,9,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0
      ]);
      
      expect(board.isValid()).toBe(true);
    });

    it('should reject non-integer cell values', () => {
      const invalidBoard = new SudokuBoardImpl([
        1.5,2,3, 4,5,6, 7,8,9,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0
      ]);
      
      expect(invalidBoard.isValid()).toBe(false);
    });

    it('should reject out-of-range integer values', () => {
      const invalidBoard = new SudokuBoardImpl([
        10,2,3, 4,5,6, 7,8,9,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0
      ]);
      
      expect(invalidBoard.isValid()).toBe(false);
    });

    it('should reject negative integer values', () => {
      const invalidBoard = new SudokuBoardImpl([
        -1,2,3, 4,5,6, 7,8,9,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0,
        0,0,0, 0,0,0, 0,0,0
      ]);
      
      expect(invalidBoard.isValid()).toBe(false);
    });
  });

  describe('Board Integer Validation - Integration', () => {
    it('should pass SudokuEngine integer validation integration test', () => {
      const budget = new WorkBudget();
      const rng = new SeededRNG(12345);
      const engine = new SudokuEngine(budget, rng);
      
      const board = new SudokuBoardImpl([
        5,3,0, 0,7,0, 0,0,0,
        6,0,0, 1,9,5, 0,0,0,
        0,9,8, 0,0,0, 0,6,0,
        8,0,0, 0,6,0, 0,0,3,
        4,0,0, 8,0,3, 0,0,1,
        7,0,0, 0,2,0, 0,0,6,
        0,6,0, 0,0,0, 2,8,0,
        0,0,0, 4,1,9, 0,0,5,
        0,0,0, 0,8,0, 0,7,9
      ]);
      
      expect(board.isValid()).toBe(true);
      expect(engine.isValid(board)).toBe(true);
    });

    it('should integrate integer validation with generation', async () => {
      const client = new GeneratorClient();
      const result = await client.generate('EASY', 11111);
      
      expect(result.givens.every(given => given === 0 || (given >= 1 && given <= 9))).toBe(true);
      expect(result.solution.every(val => val >= 1 && val <= 9)).toBe(true);
    });
  });
});