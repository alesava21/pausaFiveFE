/**
 * Sudoku Generator Client Adapter
 * Communicates with the Web Worker for puzzle generation.
 * Handles requestId tracking, cancellation, and stale response prevention.
 */

import { Difficulty, SudokuPuzzle, Limits } from './sudoku-engine';
import { GenerateRequest, GenerateResponse, CancelRequest } from './generator.worker';

/** Configuration for the generator client. */
export interface GeneratorClientConfig {
  /** Worker script URL (relative to base). */
  workerUrl: string;
  /** Default generation limits. */
  defaultLimits?: Limits;
}

/** Result of a generation request. */
export interface GeneratorResult {
  readonly puzzle: SudokuPuzzle;
  readonly requestId: number;
}

/** Error codes for generator failures. */
export enum GeneratorErrorCode {
  WORKER_UNAVAILABLE = 'WORKER_UNAVAILABLE',
  GENERATION_FAILED = 'GENERATION_FAILED',
  CANCELLED = 'CANCELLED',
  STALE_RESPONSE = 'STALE_RESPONSE',
}

/** Typed error for generator failures. */
export class GeneratorError extends Error {
  readonly code: GeneratorErrorCode;
  readonly requestId: number;

  constructor(code: GeneratorErrorCode, message: string, requestId: number) {
    super(message);
    this.name = 'GeneratorError';
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * Client for generating Sudoku puzzles via Web Worker.
 * Ensures stale responses are ignored when a new request is made.
 */
export class SudokuGeneratorClient {
  private worker: Worker | null = null;
  private readonly config: GeneratorClientConfig;
  private requestIdCounter = 0;
  private pendingRequestId: number | null = null;
  private readonly responseHandlers = new Map<
    number,
    {
      resolve: (value: GeneratorResult) => void;
      reject: (error: Error) => void;
    }
  >();
  private readonly workerFactory?: () => Worker;

  constructor(config: GeneratorClientConfig, workerFactory?: () => Worker) {
    this.config = config;
    this.workerFactory = workerFactory;
  }

  /**
   * Initialize the Web Worker.
   * Must be called before generate().
   */
  init(): void {
    if (this.worker) return;

    try {
      this.worker = this.workerFactory
        ? this.workerFactory()
        : new Worker(new URL('./generator.worker', import.meta.url), {
            type: 'module',
          });

      this.worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
        this.handleResponse(event.data);
      };

      this.worker.onerror = (error) => {
        this.rejectAllPending(
          new GeneratorError(
            GeneratorErrorCode.WORKER_UNAVAILABLE,
            `Worker error: ${error.message}`,
            -1,
          ),
        );
      };
    } catch (error) {
      throw new GeneratorError(
        GeneratorErrorCode.WORKER_UNAVAILABLE,
        `Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
        -1,
      );
    }
  }

  /**
   * Generate a Sudoku puzzle.
   * Cancels any previous pending request to prevent stale responses.
   */
  async generate(difficulty: Difficulty, seed: number, limits?: Limits): Promise<GeneratorResult> {
    if (!this.worker) {
      this.init();
    }

    // Cancel any previous pending request
    if (this.pendingRequestId !== null) {
      this.cancel(this.pendingRequestId);
    }

    const requestId = ++this.requestIdCounter;
    this.pendingRequestId = requestId;

    const request: GenerateRequest = {
      requestId,
      difficulty,
      seed,
      limits: limits ?? this.config.defaultLimits,
    };

    return new Promise((resolve, reject) => {
      this.responseHandlers.set(requestId, { resolve, reject });

      if (!this.worker) {
        reject(
          new GeneratorError(
            GeneratorErrorCode.WORKER_UNAVAILABLE,
            'Worker not initialized',
            requestId,
          ),
        );
        return;
      }

      this.worker.postMessage(request);
    });
  }

  /**
   * Cancel a pending request by ID.
   */
  cancel(requestId: number): void {
    if (!this.worker) return;

    const handler = this.responseHandlers.get(requestId);
    if (handler) {
      handler.reject(
        new GeneratorError(
          GeneratorErrorCode.CANCELLED,
          'Request cancelled by new generation request',
          requestId,
        ),
      );
      this.responseHandlers.delete(requestId);
    }

    // Send cancel message to worker
    const cancelRequest: CancelRequest = { requestId, type: 'cancel' };
    this.worker.postMessage(cancelRequest);

    if (this.pendingRequestId === requestId) {
      this.pendingRequestId = null;
    }
  }

  /**
   * Handle response from worker.
   * Ignores stale responses (responses for cancelled/old requests).
   */
  private handleResponse(response: GenerateResponse): void {
    const { requestId, puzzle, error } = response;

    const handler = this.responseHandlers.get(requestId);
    if (!handler) {
      // Stale response - no handler (cancelled or superseded)
      return;
    }

    this.responseHandlers.delete(requestId);

    if (this.pendingRequestId === requestId) {
      this.pendingRequestId = null;
    }

    if (error) {
      handler.reject(new GeneratorError(GeneratorErrorCode.GENERATION_FAILED, error, requestId));
      return;
    }

    if (!puzzle) {
      handler.reject(
        new GeneratorError(
          GeneratorErrorCode.GENERATION_FAILED,
          'Nessun puzzle ricevuto dal worker',
          requestId,
        ),
      );
      return;
    }

    handler.resolve({ puzzle, requestId });
  }

  /**
   * Reject all pending requests (e.g., on worker error).
   */
  private rejectAllPending(error: Error): void {
    for (const [, handler] of this.responseHandlers) {
      handler.reject(error);
    }
    this.responseHandlers.clear();
    this.pendingRequestId = null;
  }

  /**
   * Terminate the worker and clean up.
   */
  terminate(): void {
    this.rejectAllPending(
      new GeneratorError(GeneratorErrorCode.WORKER_UNAVAILABLE, 'Client terminated', -1),
    );

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Factory function to create a generator client.
 * Use this instead of direct instantiation for better testability.
 */
export function createGeneratorClient(
  config: GeneratorClientConfig,
  workerFactory?: () => Worker,
): SudokuGeneratorClient {
  return new SudokuGeneratorClient(config, workerFactory);
}
