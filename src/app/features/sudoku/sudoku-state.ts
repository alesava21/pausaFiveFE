import { SudokuDigit } from '../../core/api/api-contracts';

export const SUDOKU_STORAGE_VERSION = 1;
export const SUDOKU_STORAGE_PREFIX = 'sudoku:board:';

export interface SudokuCell {
  value: SudokuDigit;
  notes: SudokuDigit[];
  isGiven: boolean;
}

export interface SudokuBoard {
  cells: SudokuCell[];
  puzzleId: string;
  version: number;
  updatedAt: number;
  undoStack: readonly { index: number; prevValue: SudokuDigit; prevNotes: SudokuDigit[] }[];
}

function storageKey(puzzleId: string): string {
  return `${SUDOKU_STORAGE_PREFIX}${puzzleId}`;
}

function isSudokuDigit(n: unknown): n is SudokuDigit {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 9;
}

function validateGivens(givens: unknown): givens is readonly SudokuDigit[] {
  return Array.isArray(givens) && givens.length === 81 && givens.every(isSudokuDigit);
}

function validateStoredBoard(raw: unknown, expectedPuzzleId: string): SudokuBoard | null {
  if (!raw || typeof raw !== 'object') return null;
  const board = raw as Record<string, unknown>;
  if (typeof board['version'] !== 'number' || board['version'] !== SUDOKU_STORAGE_VERSION)
    return null;
  if (typeof board['puzzleId'] !== 'string' || board['puzzleId'] !== expectedPuzzleId) return null;
  if (!Array.isArray(board['cells']) || board['cells'].length !== 81) return null;
  for (const cell of board['cells']) {
    if (!cell || typeof cell !== 'object') return null;
    const c = cell as Record<string, unknown>;
    if (!isSudokuDigit(c['value'])) return null;
    if (!Array.isArray(c['notes']) || !c['notes'].every(isSudokuDigit)) return null;
    if (typeof c['isGiven'] !== 'boolean') return null;
  }
  if (typeof board['updatedAt'] !== 'number' || !Number.isFinite(board['updatedAt'])) return null;
  if (!Array.isArray(board['undoStack'])) return null;
  for (const entry of board['undoStack']) {
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as Record<string, unknown>;
    if (!isSudokuDigit(e['index'])) return null;
    if (!isSudokuDigit(e['prevValue'])) return null;
    if (!Array.isArray(e['prevNotes']) || !e['prevNotes'].every(isSudokuDigit)) return null;
  }
  return raw as SudokuBoard;
}

function createCell(value: SudokuDigit, isGiven: boolean): SudokuCell {
  return { value, notes: [], isGiven };
}

export function createBoard(givens: readonly SudokuDigit[]): SudokuBoard {
  return {
    cells: givens.map((v) => createCell(v, v !== 0)),
    puzzleId: '',
    version: SUDOKU_STORAGE_VERSION,
    updatedAt: Date.now(),
    undoStack: [],
  };
}

export function loadBoard(puzzleId: string, givens: readonly SudokuDigit[]): SudokuBoard {
  if (!validateGivens(givens)) {
    const fresh = createBoard(Array(81).fill(0) as readonly SudokuDigit[]);
    fresh.puzzleId = puzzleId;
    return fresh;
  }
  const fresh = createBoard(givens);
  fresh.puzzleId = puzzleId;

  if (typeof window === 'undefined') {
    return fresh;
  }

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    return fresh;
  }

  if (!storage) {
    return fresh;
  }

  try {
    const raw = storage.getItem(storageKey(puzzleId));
    if (!raw) return fresh;

    const parsed = JSON.parse(raw);
    const validated = validateStoredBoard(parsed, puzzleId);
    if (!validated) {
      storage.removeItem(storageKey(puzzleId));
      return fresh;
    }

    const givensValid = validated.cells.every((cell, i) =>
      givens[i] === 0 ? true : cell.value === givens[i] && cell.isGiven,
    );
    if (!givensValid) {
      storage.removeItem(storageKey(puzzleId));
      return fresh;
    }

    validated.puzzleId = puzzleId;
    return validated;
  } catch {
    try {
      storage.removeItem(storageKey(puzzleId));
    } catch {
      /* ignore */
    }
    return fresh;
  }
}

export function saveBoard(board: SudokuBoard): void {
  if (typeof window === 'undefined') return;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }
  if (!storage) return;
  try {
    const toSave = { ...board, updatedAt: Date.now() };
    storage.setItem(storageKey(board.puzzleId), JSON.stringify(toSave));
  } catch {
    /* Storage full or unavailable - game continues without persistence */
  }
}

export function clearBoard(puzzleId: string): void {
  if (typeof window === 'undefined') return;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }
  if (!storage) return;
  try {
    storage.removeItem(storageKey(puzzleId));
  } catch {
    /* ignore */
  }
}

function deepCloneCells(cells: SudokuCell[]): SudokuCell[] {
  return cells.map((c) => ({ ...c, notes: [...c.notes] }));
}

export function applyMove(board: SudokuBoard, index: number, digit: SudokuDigit): SudokuBoard {
  if (index < 0 || index >= 81) return board;
  const cell = board.cells[index];
  if (cell.isGiven) return board;
  if (cell.value === digit) return board;

  const newCells = deepCloneCells(board.cells);
  newCells[index] = { ...cell, value: digit, notes: [] };

  const undoEntry = { index, prevValue: cell.value, prevNotes: cell.notes };
  return {
    ...board,
    cells: newCells,
    updatedAt: Date.now(),
    undoStack: [...board.undoStack, undoEntry].slice(-50),
  };
}

export function applyNote(board: SudokuBoard, index: number, digit: SudokuDigit): SudokuBoard {
  if (index < 0 || index >= 81) return board;
  const cell = board.cells[index];
  if (cell.isGiven) return board;
  if (cell.value !== 0) return board;

  const newNotes = cell.notes.includes(digit)
    ? cell.notes.filter((n) => n !== digit)
    : [...cell.notes, digit].sort((a, b) => a - b);

  if (newNotes.length === cell.notes.length && newNotes.every((n, i) => n === cell.notes[i])) {
    return board;
  }

  const newCells = deepCloneCells(board.cells);
  newCells[index] = { ...cell, notes: newNotes };

  const undoEntry = { index, prevValue: cell.value, prevNotes: cell.notes };
  return {
    ...board,
    cells: newCells,
    updatedAt: Date.now(),
    undoStack: [...board.undoStack, undoEntry].slice(-50),
  };
}

export function clearCell(board: SudokuBoard, index: number): SudokuBoard {
  if (index < 0 || index >= 81) return board;
  const cell = board.cells[index];
  if (cell.isGiven || (cell.value === 0 && cell.notes.length === 0)) return board;

  const newCells = deepCloneCells(board.cells);
  newCells[index] = { ...cell, value: 0, notes: [] };

  const undoEntry = { index, prevValue: cell.value, prevNotes: cell.notes };
  return {
    ...board,
    cells: newCells,
    updatedAt: Date.now(),
    undoStack: [...board.undoStack, undoEntry].slice(-50),
  };
}

export function undo(board: SudokuBoard): SudokuBoard | null {
  if (board.undoStack.length === 0) return null;
  const last = board.undoStack[board.undoStack.length - 1];
  const newCells = deepCloneCells(board.cells);
  newCells[last.index] = {
    ...newCells[last.index],
    value: last.prevValue,
    notes: [...last.prevNotes],
  };
  return {
    ...board,
    cells: newCells,
    updatedAt: Date.now(),
    undoStack: board.undoStack.slice(0, -1),
  };
}

export function toServerBoard(board: SudokuBoard): readonly SudokuDigit[] {
  return board.cells.map((c) => c.value) as readonly SudokuDigit[];
}

export function isComplete(board: SudokuBoard): boolean {
  return board.cells.every((c) => c.value !== 0);
}

export function hasConflicts(board: SudokuBoard): boolean {
  for (let i = 0; i < 81; i++) {
    const v = board.cells[i].value;
    if (v === 0) continue;
    const row = Math.floor(i / 9);
    const col = i % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let j = 0; j < 9; j++) {
      if (j !== col && board.cells[row * 9 + j].value === v) return true;
      if (j !== row && board.cells[j * 9 + col].value === v) return true;
      const br = boxRow + Math.floor(j / 3);
      const bc = boxCol + (j % 3);
      const idx = br * 9 + bc;
      if (idx !== i && board.cells[idx].value === v) return true;
    }
  }
  return false;
}
