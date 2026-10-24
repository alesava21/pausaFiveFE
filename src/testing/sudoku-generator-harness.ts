// Test-only entry point. Not reachable from the application or production assets.
import {
  createGeneratorClient,
  GeneratorError,
} from '../app/features/sudoku/engine/generator-client';
import { SudokuGenerator, type SudokuPuzzleDTO } from '../app/features/sudoku/engine/sudoku-engine';

export interface HarnessState {
  running: boolean;
  completed: boolean;
  error: string | null;
  puzzles: SudokuPuzzleDTO[];
  heartbeat: number[];
  longTasks: number[];
  longTaskSupported: boolean;
  inputEvents: number;
  inputDuringGeneration: number;
  mainThreadGenerations: number;
  cancelled: string | null;
}

declare global {
  interface Window {
    sudokuHarness: HarnessState;
  }
}

const state: HarnessState = (window.sudokuHarness = {
  running: false,
  completed: false,
  error: null,
  puzzles: [],
  heartbeat: [],
  longTasks: [],
  longTaskSupported: PerformanceObserver.supportedEntryTypes.includes('longtask'),
  inputEvents: 0,
  inputDuringGeneration: 0,
  mainThreadGenerations: 0,
  cancelled: null,
});
// A separate module instance lives in the real Worker. This traps accidental main-thread generation.
SudokuGenerator.generate = () => {
  state.mainThreadGenerations++;
  throw new Error('Generazione eseguita sul main thread');
};
const client = createGeneratorClient({});
const zero = { attempts: 0, maxWork: 0, maxDurationMs: 0 };
const status = document.querySelector<HTMLOutputElement>('#status')!;
const generate = document.querySelector<HTMLButtonElement>('#generate')!;
const cancel = document.querySelector<HTMLButtonElement>('#cancel')!;
document.querySelector<HTMLInputElement>('#input')!.addEventListener('input', () => {
  state.inputEvents++;
  if (state.running) state.inputDuringGeneration++;
});
let previous = performance.now();
setInterval(() => {
  const now = performance.now();
  if (state.running) state.heartbeat.push(now - previous);
  previous = now;
}, 10);
let measurementStart = Infinity;
let measurementEnd = Infinity;
if (state.longTaskSupported) {
  new PerformanceObserver((list) => {
    state.longTasks.push(
      ...list
        .getEntries()
        .filter(
          (entry) =>
            entry.startTime + entry.duration > measurementStart &&
            entry.startTime <= measurementEnd,
        )
        .map((entry) => entry.duration),
    );
  }).observe({ type: 'longtask' });
}

function dto(puzzle: SudokuPuzzleDTO): SudokuPuzzleDTO {
  return {
    givens: puzzle.givens,
    solution: puzzle.solution,
    difficulty: puzzle.difficulty,
    fallback: puzzle.fallback,
  };
}

generate.addEventListener('click', () => {
  measurementStart = performance.now();
  measurementEnd = Infinity;
  state.running = true;
  state.completed = false;
  state.error = null;
  state.heartbeat = [];
  state.longTasks = [];
  void (async () => {
    try {
      for (const difficulty of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const result = await client.generate(difficulty, 11);
        state.puzzles.push(dto(result.puzzle));
        const fallback = await client.generate(difficulty, 12, zero);
        state.puzzles.push(dto(fallback.puzzle));
      }
      state.completed = true;
      status.value = 'Generazione offline completata';
    } catch (error) {
      state.error = String(error);
    } finally {
      measurementEnd = performance.now();
      state.running = false;
    }
  })();
});

cancel.addEventListener('click', () => {
  void (async () => {
    try {
      const first = client.generate('HARD', 13).catch((error) => {
        state.cancelled = error instanceof GeneratorError ? error.code : String(error);
      });
      const second = client.generate('MEDIUM', 14, zero);
      await first;
      const result = await second;
      state.puzzles = [dto(result.puzzle)];
      status.value = 'Cancellazione completata';
    } catch (error) {
      state.error = String(error);
    }
  })();
});

// Warm up the actual module Worker and all its assets BEFORE the test goes offline.
void client
  .generate('EASY', 0, zero)
  .then(() => {
    generate.disabled = false;
    cancel.disabled = false;
    status.value = 'Asset pronti';
  })
  .catch((error) => {
    state.error = String(error);
  });
window.addEventListener('pagehide', () => client.terminate());
