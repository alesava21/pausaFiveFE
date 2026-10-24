export class LogicalSolver {
  static singles(board: SudokuBoard, solution: number[]): Difficulty {
    let changed = false;
    for (let cell = 0; cell < 81; cell++) {
      if (board.isCandidate(cell)) continue;
      const candidates = board.candidates(cell);
      if (candidates.length === 1) {
        solution[cell] = candidates[0];
        changed = true;
      }
    }
    return changed ? 'EASY' : 'MEDIUM';
  }

  static lockedCandidates(board: SudokuBoard, solution: number[]): Difficulty {
    let changed = false;
    const boxes = Array.from({ length: 9 }, () => new Set<number>());
    const rows = Array.from({ length: 9 }, () => new Set<number>());
    const cols = Array.from({ length: 9 }, () => new Set<number>());

    for (let cell = 0; cell < 81; cell++) {
      const val = solution[cell];
      if (val === 0) continue;
      const row = Math.floor(cell / 9);
      const col = cell % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      boxes[box].add(val);
      rows[row].add(val);
      cols[col].add(val);
    }

    for (let cell = 0; cell < 81; cell++) {
      if (solution[cell] !== 0) continue;
      const candidates = board.candidates(cell);
      const row = Math.floor(cell / 9);
      const col = cell % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

      const rowOnly = candidates.filter((c) => rows[row].has(c));
      const colOnly = candidates.filter((c) => cols[col].has(c));
      const boxOnly = candidates.filter((c) => boxes[box].has(c));

      if (rowOnly.length > 1 && rowOnly.length < candidates.length) {
        for (const c of candidates) {
          if (!rows[row].has(c)) {
            solution[cell] = c;
            changed = true;
            break;
          }
        }
      } else if (colOnly.length > 1 && colOnly.length < candidates.length) {
        for (const c of candidates) {
          if (!cols[col].has(c)) {
            solution[cell] = c;
            changed = true;
            break;
          }
        }
      } else if (boxOnly.length > 1 && boxOnly.length < candidates.length) {
        for (const c of candidates) {
          if (!boxes[box].has(c)) {
            solution[cell] = c;
            changed = true;
            break;
          }
        }
      }
    }

    return changed ? 'MEDIUM' : 'HARD';
  }

  static nakedPairs(board: SudokuBoard, solution: number[]): boolean {
    const seenPairs = new Map<string, number[]>();
    for (let cell = 0; cell < 81; cell++) {
      if (solution[cell] !== 0) continue;
      const candidates = board.candidates(cell);
      if (candidates.length !== 2) continue;
      const pairKey = candidates.sort().join(',');
      seenPairs.set(pairKey, [...(seenPairs.get(pairKey) || []), cell]);
    }

    for (const [pairKey, cells] of seenPairs.entries()) {
      if (cells.length >= 2) {
        for (const cell of cells) {
          for (const otherCell of cells) {
            if (cell === otherCell) continue;
            const otherCandidates = board.candidates(otherCell);
            for (const c of otherCandidates) {
              if (!pairKey.includes(c.toString())) {
                solution[otherCell] = c;
              }
            }
          }
        }
      }
    }

    return false;
  }

  static solve(
    board: SudokuBoard,
    maxWork: number = Number.MAX_SAFE_INTEGER,
    maxTime: number = 86400000,
    startTime: number = Date.now(),
  ): boolean {
    const solution = new Array(81).fill(0);
    const initialDifficulty = 'EASY';
    let difficulty = initialDifficulty;

    const applyTechnique = () => {
      const techniques = [
        () => LogicalSolver.singles(board, solution),
        () => LogicalSolver.lockedCandidates(board, solution),
      ];
      for (const technique of techniques) {
        const newDifficulty = technique();
        if (newDifficulty !== difficulty && newDifficulty !== 'HARD') {
          difficulty = newDifficulty;
        }
      }
    };

    const findEmptyCell = () => {
      for (let cell = 0; cell < 81; cell++) {
        if (solution[cell] === 0) return cell;
      }
      return -1;
    };

    const getCandidates = (cell: number): number[] => {
      const row = Math.floor(cell / 9);
      const col = cell % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const used = new Set<number>();

      for (let i = 0; i < 81; i++) {
        if (solution[i] === 0) continue;
        const r = Math.floor(i / 9);
        const c = i % 9;
        if (r === row || c === col || Math.floor(r / 3) === Math.floor(box / 3)) {
          used.add(solution[i]);
        }
      }

      return board.candidates(cell).filter((c) => !used.has(c));
    };

    let cell = findEmptyCell();
    while (cell !== -1) {
      const candidates = getCandidates(cell);
      if (candidates.length === 0) {
        return false;
      }

      for (const candidate of candidates) {
        solution[cell] = candidate;
        const result = LogicalSolver.solve(board, maxWork, maxTime, startTime);
        if (result) {
          return true;
        }
        solution[cell] = 0;
      }

      return false;
    }

    return true;
  }
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
