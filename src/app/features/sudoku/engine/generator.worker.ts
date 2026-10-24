/**
 * Sudoku Generator Web Worker
 * Runs puzzle generation off the main thread for endless mode.
 * Pure TypeScript, no Angular dependencies.
 */

import { Difficulty, generate, SudokuPuzzle, Limits } from './sudoku-engine';

// Worker message protocol types
export interface GenerateRequest {
  readonly requestId: number;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly limits?: Limits;
}

export interface GenerateResponse {
  readonly requestId: number;
  readonly puzzle?: SudokuPuzzle;
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
      const response: GenerateResponse = {
        requestId,
        puzzle,
        fallback: puzzle.fallback,
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
