import { SudokuDigit } from '../../core/api/api-contracts';
import {
  applyMove,
  applyNote,
  clearCell,
  createBoard,
  hasConflicts,
  isComplete,
  loadBoard,
  saveBoard,
  clearBoard,
  toServerBoard,
  undo,
} from './sudoku-state';

const givens: readonly SudokuDigit[] = [
  5, 3, 0, 0, 7, 0, 0, 0, 0, 6, 0, 0, 1, 9, 5, 0, 0, 0, 0, 9, 8, 0, 0, 0, 0, 6, 0, 8, 0, 0, 0, 6, 0,
  0, 0, 3, 4, 0, 0, 8, 0, 3, 0, 0, 1, 7, 0, 0, 0, 2, 0, 0, 0, 6, 0, 6, 0, 0, 0, 0, 2, 8, 0, 0, 0, 0,
  4, 1, 9, 0, 0, 5, 0, 0, 0, 0, 8, 0, 0, 7, 9,
];

const puzzleId = 'test-puzzle-id';

describe('Sudoku state & persistence', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T12:00:00+02:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('creates fresh board from givens', () => {
    const board = createBoard(givens);
    expect(board.cells).toHaveLength(81);
    expect(board.cells[0].value).toBe(5);
    expect(board.cells[0].isGiven).toBe(true);
    expect(board.cells[2].value).toBe(0);
    expect(board.cells[2].isGiven).toBe(false);
    expect(board.undoStack).toHaveLength(0);
  });

  it('loads fresh board when no storage', () => {
    const board = loadBoard(puzzleId, givens);
    expect(board.puzzleId).toBe(puzzleId);
    expect(board.cells[0].value).toBe(5);
    expect(board.cells[0].isGiven).toBe(true);
  });

  it('resumes board from storage matching puzzleId', () => {
    const board = createBoard(givens);
    board.puzzleId = puzzleId;
    board.cells[2].value = 4;
    board.cells[2].notes = [1, 2];
    saveBoard(board);

    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.puzzleId).toBe(puzzleId);
    expect(loaded.cells[2].value).toBe(4);
    expect(loaded.cells[2].notes).toEqual([1, 2]);
    expect(loaded.cells[0].value).toBe(5);
    expect(loaded.cells[0].isGiven).toBe(true);
  });

  it('rejects storage with different puzzleId', () => {
    const board = createBoard(givens);
    board.puzzleId = 'other-puzzle';
    saveBoard(board);

    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[2].value).toBe(0);
    expect(loaded.cells[2].notes).toEqual([]);
  });

  it('rejects corrupted storage: wrong length', () => {
    if (!window.localStorage) return;
    window.localStorage.setItem(
      `sudoku:board:${puzzleId}`,
      JSON.stringify({ version: 1, puzzleId, cells: [], updatedAt: Date.now(), undoStack: [] }),
    );
    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[2].value).toBe(0);
  });

  it('rejects corrupted storage: non-digits in cells', () => {
    if (!window.localStorage) return;
    const bad = createBoard(givens);
    bad.puzzleId = puzzleId;
    bad.cells[0] = { ...bad.cells[0], value: 'x' as unknown as SudokuDigit };
    window.localStorage.setItem(`sudoku:board:${puzzleId}`, JSON.stringify(bad));
    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[0].value).toBe(5);
  });

  it('rejects storage with altered givens', () => {
    const board = createBoard(givens);
    board.puzzleId = puzzleId;
    board.cells[0].value = 1;
    board.cells[0].isGiven = false;
    saveBoard(board);

    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[0].value).toBe(5);
    expect(loaded.cells[0].isGiven).toBe(true);
  });

  it('handles Storage unavailable (SecurityError)', () => {
    const originalLS = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => {
          throw new DOMException('Storage bloccato', 'SecurityError');
        },
        setItem: () => {
          throw new DOMException('Storage bloccato', 'SecurityError');
        },
        removeItem: () => {
          throw new DOMException('Storage bloccato', 'SecurityError');
        },
      },
      configurable: true,
    });

    const board = loadBoard(puzzleId, givens);
    expect(board.cells[0].value).toBe(5);
    expect(() => saveBoard(board)).not.toThrow();
    expect(() => clearBoard(puzzleId)).not.toThrow();

    Object.defineProperty(window, 'localStorage', { value: originalLS, configurable: true });
  });

  it('handles localStorage getter throwing SecurityError', () => {
    const originalLS = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Storage bloccato', 'SecurityError');
      },
      configurable: true,
    });

    const board = loadBoard(puzzleId, givens);
    expect(board.cells[0].value).toBe(5);
    expect(() => saveBoard(board)).not.toThrow();
    expect(() => clearBoard(puzzleId)).not.toThrow();

    Object.defineProperty(window, 'localStorage', { value: originalLS, configurable: true });
  });

  it('applies move without mutating givens', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 4);
    expect(board.cells[2].value).toBe(4);
    expect(board.cells[2].notes).toEqual([]);
    expect(board.cells[0].value).toBe(5);
    expect(board.undoStack).toHaveLength(1);

    board = applyMove(board, 0, 9);
    expect(board.cells[0].value).toBe(5);
    expect(board.undoStack).toHaveLength(1);
  });

  it('applies and toggles notes', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyNote(board, 2, 1);
    expect(board.cells[2].notes).toEqual([1]);
    board = applyNote(board, 2, 2);
    expect(board.cells[2].notes).toEqual([1, 2]);
    board = applyNote(board, 2, 1);
    expect(board.cells[2].notes).toEqual([2]);
  });

  it('does not add notes to filled cells', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 4);
    board = applyNote(board, 2, 1);
    expect(board.cells[2].notes).toEqual([]);
  });

  it('clears cell and records undo', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 4);
    board = applyNote(board, 2, 1);
    board = clearCell(board, 2);
    expect(board.cells[2].value).toBe(0);
    expect(board.cells[2].notes).toEqual([]);
    expect(board.undoStack).toHaveLength(2);
  });

  it('undo reverts last local move', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 4);
    board = applyNote(board, 3, 2);
    expect(board.cells[2].value).toBe(4);
    expect(board.cells[3].notes).toEqual([2]);

    board = undo(board)!;
    expect(board.cells[3].notes).toEqual([]);
    expect(board.cells[2].value).toBe(4);

    board = undo(board)!;
    expect(board.cells[2].value).toBe(0);
    expect(board.undoStack).toHaveLength(0);
  });

  it('undo returns null when stack empty', () => {
    const board = createBoard(givens);
    board.puzzleId = puzzleId;
    expect(undo(board)).toBeNull();
  });

  it('serializes board to 81 digits for server finish', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 4);
    board = applyMove(board, 3, 2);
    const serverBoard = toServerBoard(board);
    expect(serverBoard).toHaveLength(81);
    expect(serverBoard[0]).toBe(5);
    expect(serverBoard[2]).toBe(4);
    expect(serverBoard[3]).toBe(2);
    expect(serverBoard.every((n) => n >= 0 && n <= 9)).toBe(true);
  });

  it('detects complete board', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    expect(isComplete(board)).toBe(false);
    for (let i = 0; i < 81; i++) {
      if (!board.cells[i].isGiven) {
        board = applyMove(board, i, 1);
      }
    }
    expect(isComplete(board)).toBe(true);
  });

  it('detects conflicts in rows, columns, boxes', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 2, 5);
    expect(hasConflicts(board)).toBe(true);

    board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 11, 3);
    expect(hasConflicts(board)).toBe(true);

    board = createBoard(givens);
    board.puzzleId = puzzleId;
    board = applyMove(board, 10, 5);
    expect(hasConflicts(board)).toBe(true);
  });

  it('persists board after each change', () => {
    let board = loadBoard(puzzleId, givens);
    board = applyMove(board, 2, 4);
    saveBoard(board);

    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[2].value).toBe(4);
  });

  it('clearBoard removes storage', () => {
    let board = loadBoard(puzzleId, givens);
    board = applyMove(board, 2, 4);
    saveBoard(board);
    clearBoard(puzzleId);

    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[2].value).toBe(0);
  });

  it('undoStack limited to 50 entries', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    for (let i = 0; i < 60; i++) {
      const idx = i % 81;
      if (!board.cells[idx].isGiven) {
        board = applyMove(board, idx, ((i % 9) + 1) as SudokuDigit);
      }
    }
    expect(board.undoStack.length).toBeLessThanOrEqual(50);
  });

  it('save/load works with undo indices > 9 (regression for index validation)', () => {
    let board = createBoard(givens);
    board.puzzleId = puzzleId;
    // Find non-given indices > 9
    const nonGivenIndices = board.cells
      .map((c, i) => ({ index: i, isGiven: c.isGiven }))
      .filter((c) => !c.isGiven && c.index > 9)
      .map((c) => c.index);
    expect(nonGivenIndices.length).toBeGreaterThanOrEqual(3);
    // Use first 3 non-given indices > 9
    const [idxA, idxB, idxC] = nonGivenIndices.slice(0, 3);
    board = applyMove(board, idxA, 4 as SudokuDigit);
    board = applyMove(board, idxB, 5 as SudokuDigit);
    board = applyMove(board, idxC, 6 as SudokuDigit);
    expect(board.undoStack.length).toBeGreaterThanOrEqual(3);
    // Verify indices are in valid range 0-80
    for (const entry of board.undoStack) {
      expect(entry.index).toBeGreaterThanOrEqual(0);
      expect(entry.index).toBeLessThanOrEqual(80);
    }
    saveBoard(board);
    // Load back and verify the moves persisted
    const loaded = loadBoard(puzzleId, givens);
    expect(loaded.cells[idxA].value).toBe(board.cells[idxA].value);
    expect(loaded.cells[idxB].value).toBe(board.cells[idxB].value);
    expect(loaded.cells[idxC].value).toBe(board.cells[idxC].value);
    // Verify undo stack also loaded
    expect(loaded.undoStack.length).toBe(board.undoStack.length);
    for (let i = 0; i < loaded.undoStack.length; i++) {
      expect(loaded.undoStack[i].index).toBe(board.undoStack[i].index);
    }
  });

  it('validateGivens rejects invalid input', () => {
    const board = loadBoard(puzzleId, [1, 2, 3] as unknown as readonly SudokuDigit[]);
    expect(board.cells).toHaveLength(81);
  });
});
