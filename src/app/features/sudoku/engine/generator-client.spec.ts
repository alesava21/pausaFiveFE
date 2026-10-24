import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Difficulty, Limits, generate, SudokuGenerator } from './sudoku-engine';
import {
  SudokuGeneratorClient,
  GeneratorError,
  GeneratorErrorCode,
  createGeneratorClient,
} from './generator-client';

// Mock Worker for testing
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messages: Array<{ data: unknown }> = [];
  private terminated = false;

  postMessage(data: unknown): void {
    if (this.terminated) return;
    this.messages.push({ data: structuredClone(data) });
  }

  terminate(): void {
    this.terminated = true;
  }

  // For testing: simulate a response
  simulateResponse(response: unknown): void {
    if (this.onmessage && !this.terminated) {
      this.onmessage({ data: structuredClone(response) } as MessageEvent);
    }
  }

  // For testing: simulate error
  simulateError(error: Error): void {
    if (this.onerror && !this.terminated) {
      this.onerror({ message: error.message } as ErrorEvent);
    }
  }

  getLastMessage(): unknown | undefined {
    return this.messages[this.messages.length - 1]?.data;
  }

  getAllMessages(): unknown[] {
    return this.messages.map((m) => m.data);
  }
}

let mockWorkerInstance: MockWorker | null = null;

function createMockWorker(): Worker {
  mockWorkerInstance = new MockWorker();
  return mockWorkerInstance as unknown as Worker;
}

describe('SudokuGeneratorClient', () => {
  let client: SudokuGeneratorClient;

  beforeEach(() => {
    client = createGeneratorClient(
      {
        defaultLimits: { attempts: 12, maxWork: 250_000, maxDurationMs: 500 },
      },
      createMockWorker,
    );
  });

  afterEach(() => {
    client.terminate();
    mockWorkerInstance = null;
  });

  it('verify validates the received puzzle and never generates another puzzle', async () => {
    const source = generate(Difficulty.EASY, 4, { attempts: 0, maxWork: 0, maxDurationMs: 0 });
    const dto = {
      givens: [...source.givens],
      solution: [...source.solution],
      difficulty: source.difficulty,
      fallback: true,
    };
    dto.solution[0] = 0;
    const spy = vi.spyOn(SudokuGenerator, 'generate');
    try {
      const promise = client.generate(Difficulty.EASY, 4);
      mockWorkerInstance!.simulateResponse(structuredClone({ requestId: 1, puzzle: dto }));
      const result = await promise;
      expect(() => result.puzzle.verify()).toThrow();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('creates client with config', () => {
    expect(client).toBeInstanceOf(SudokuGeneratorClient);
  });

  it('initializes worker on first generate', async () => {
    const generatePromise = client.generate(Difficulty.EASY, 12345);

    // Simulate worker response
    const requestId = 1;
    mockWorkerInstance!.simulateResponse({
      requestId,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: false,
      },
      fallback: false,
    });

    const result = await generatePromise;
    expect(result.requestId).toBe(requestId);
    expect(result.puzzle.difficulty).toBe(Difficulty.EASY);
  });

  it('cancels previous request when new one starts', async () => {
    // Start first request
    const firstPromise = client.generate(Difficulty.EASY, 111);

    // Start second request before first completes
    const secondPromise = client.generate(Difficulty.MEDIUM, 222);

    // First request should be cancelled
    await expect(firstPromise).rejects.toThrow(GeneratorError);
    await expect(firstPromise).rejects.toMatchObject({
      code: GeneratorErrorCode.CANCELLED,
    });

    // Second request should succeed
    const requestId = 2;
    mockWorkerInstance!.simulateResponse({
      requestId,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(2),
        difficulty: Difficulty.MEDIUM,
        fallback: false,
      },
      fallback: false,
    });

    const result = await secondPromise;
    expect(result.requestId).toBe(requestId);
    expect(result.puzzle.difficulty).toBe(Difficulty.MEDIUM);
  });

  it('ignores stale response from cancelled request', async () => {
    // Start first request
    const firstPromise = client.generate(Difficulty.EASY, 111);

    // Start second request (cancels first)
    const secondPromise = client.generate(Difficulty.MEDIUM, 222);

    // Simulate response for FIRST request (stale)
    mockWorkerInstance!.simulateResponse({
      requestId: 1,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: false,
      },
      fallback: false,
    });

    // First promise should still be pending (rejected due to cancellation, not resolved by stale response)
    await expect(firstPromise).rejects.toThrow(GeneratorError);

    // Now simulate response for second request
    mockWorkerInstance!.simulateResponse({
      requestId: 2,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(2),
        difficulty: Difficulty.MEDIUM,
        fallback: false,
      },
      fallback: false,
    });

    const result = await secondPromise;
    expect(result.puzzle.difficulty).toBe(Difficulty.MEDIUM);
  });

  it('rejects on worker error', async () => {
    const generatePromise = client.generate(Difficulty.EASY, 12345);

    // Simulate worker error
    mockWorkerInstance!.simulateError(new Error('Worker crashed'));

    await expect(generatePromise).rejects.toThrow(GeneratorError);
    await expect(generatePromise).rejects.toMatchObject({
      code: GeneratorErrorCode.WORKER_UNAVAILABLE,
    });
  });

  it('sanitizes worker failures and recreates the worker for the next request', async () => {
    const first = client.generate(Difficulty.EASY, 1);
    const failedWorker = mockWorkerInstance!;
    failedWorker.simulateError(new Error('file:///private/internal-worker.ts:42'));
    await expect(first).rejects.toMatchObject({ message: 'Generatore Sudoku non disponibile.' });
    const second = client.generate(Difficulty.EASY, 2);
    expect(mockWorkerInstance).not.toBe(failedWorker);
    mockWorkerInstance!.simulateResponse({
      requestId: 2,
      puzzle: {
        givens: Array(81).fill(0),
        solution: Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: true,
      },
    });
    await expect(second).resolves.toMatchObject({ requestId: 2 });
  });

  it('rejects on generation error from worker', async () => {
    const generatePromise = client.generate(Difficulty.EASY, 12345);

    mockWorkerInstance!.simulateResponse({
      requestId: 1,
      error: 'Budget esaurito',
    });

    await expect(generatePromise).rejects.toThrow(GeneratorError);
    await expect(generatePromise).rejects.toMatchObject({
      code: GeneratorErrorCode.GENERATION_FAILED,
    });
  });

  it('uses default limits when none provided', async () => {
    const generatePromise = client.generate(Difficulty.EASY, 12345);

    mockWorkerInstance!.simulateResponse({
      requestId: 1,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: false,
      },
      fallback: false,
    });

    await expect(generatePromise).resolves.toBeDefined();
  });

  it('uses custom limits when provided', async () => {
    const customLimits: Limits = { attempts: 5, maxWork: 100_000, maxDurationMs: 200 };
    const generatePromise = client.generate(Difficulty.EASY, 12345, customLimits);

    mockWorkerInstance!.simulateResponse({
      requestId: 1,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: false,
      },
      fallback: false,
    });

    await expect(generatePromise).resolves.toBeDefined();
  });

  it('terminate cleans up and rejects pending', async () => {
    const promise = client.generate(Difficulty.EASY, 12345);
    client.terminate();

    await expect(promise).rejects.toThrow(GeneratorError);
    await expect(promise).rejects.toMatchObject({
      code: GeneratorErrorCode.WORKER_UNAVAILABLE,
    });
  });

  it('cancel method rejects pending request', async () => {
    const promise = client.generate(Difficulty.EASY, 12345);

    // Get the request ID (it's 1 for first request)
    client.cancel(1);

    // The cancel() call synchronously rejects the promise via handler.reject().
    // Use Promise.race to capture the rejection properly.
    await expect(
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100)),
      ]),
    ).rejects.toThrow(GeneratorError);

    // The original promise should also be rejected with CANCELLED
    await expect(promise).rejects.toMatchObject({
      code: GeneratorErrorCode.CANCELLED,
    });
  });

  it('sends cancel message to worker', async () => {
    const promise = client.generate(Difficulty.EASY, 12345);
    client.cancel(1);

    // The promise is rejected synchronously; catch it to avoid unhandled rejection
    promise.catch(() => {});

    const messages = mockWorkerInstance!.getAllMessages();
    const cancelMsg = messages.find(
      (m): m is { type: string; requestId: number } =>
        typeof m === 'object' &&
        m !== null &&
        'type' in m &&
        m.type === 'cancel' &&
        'requestId' in m &&
        m.requestId === 1,
    );
    expect(cancelMsg).toBeDefined();
    expect(cancelMsg!.type).toBe('cancel');
  });
});
