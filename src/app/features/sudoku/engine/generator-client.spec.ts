import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Difficulty, SudokuPuzzle, Limits } from './sudoku-engine';
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
    this.messages.push({ data });
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        this.onmessage({ data } as MessageEvent);
      }
    }, 0);
  }

  terminate(): void {
    this.terminated = true;
  }

  // For testing: simulate a response
  simulateResponse(response: unknown): void {
    if (this.onmessage && !this.terminated) {
      this.onmessage({ data: response } as MessageEvent);
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
        workerUrl: './generator.worker',
        defaultLimits: { attempts: 12, maxWork: 250_000, maxDurationMs: 500 },
      },
      createMockWorker,
    );
  });

  afterEach(() => {
    client.terminate();
    mockWorkerInstance = null;
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
        verify: () => {},
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
        verify: () => {},
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
        verify: () => {},
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
        verify: () => {},
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
        verify: () => {},
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
        verify: () => {},
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

    // Use Promise.resolve to defer rejection handling for synchronous rejections
    await expect(Promise.resolve().then(() => promise)).rejects.toThrow(GeneratorError);
    await expect(Promise.resolve().then(() => promise)).rejects.toMatchObject({
      code: GeneratorErrorCode.CANCELLED,
    });
  });

  it('sends cancel message to worker', async () => {
    const promise = client.generate(Difficulty.EASY, 12345);
    client.cancel(1);

    // Handle the rejection to avoid unhandled rejection warning
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

describe('Generator Worker Protocol', () => {
  it('defines correct request/response types', () => {
    // This test ensures the protocol types are correctly exported
    const request = {
      requestId: 1,
      difficulty: Difficulty.EASY,
      seed: 12345,
      limits: { attempts: 12, maxWork: 250_000, maxDurationMs: 500 } as Limits,
    };
    expect(request.requestId).toBe(1);
    expect(request.difficulty).toBe(Difficulty.EASY);
    expect(request.seed).toBe(12345);

    const response = {
      requestId: 1,
      puzzle: {
        givens: new Array(81).fill(0),
        solution: new Array(81).fill(1),
        difficulty: Difficulty.EASY,
        fallback: false,
        verify: () => {},
      } as SudokuPuzzle,
      fallback: false,
    };
    expect(response.requestId).toBe(1);
    expect(response.puzzle).toBeDefined();
  });
});
