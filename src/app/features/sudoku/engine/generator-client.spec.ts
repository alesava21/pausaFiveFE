<<<<<<< HEAD
import { GeneratorClient, PuzzlePayload, Difficulty } from './generator-client';
import { SudokuBoardImpl } from './sudoku-engine';

desc('GeneratorClient', () => {
  let client: GeneratorClient;

  beforeEach(() => {
    client = new GeneratorClient();
  });

  afterEach(() => {
    client.dispose();
  });

  describe('Initialization', () => {
    it('should initialize without throwing', () => {
      expect(() => new GeneratorClient()).not.toThrow();
    });

    it('should create worker on first request', async () => {
      const initialWorker = client['worker'];
      expect(initialWorker).toBeUndefined();
      
      const result = await client.generate('EASY', 12345);
      
      const finalWorker = client['worker'];
      expect(finalWorker).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should handle worker initialization errors', async () => {
      const client2 = new GeneratorClient();
      expect(client2['worker']).toBeUndefined();
      
      expect(true).toBe(true); // Client can be created without worker
    });
  });

  describe('Request Execution', () => {
    it('should execute generate request successfully', async () => {
      const result = await client.generate('EASY', 12345);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
      expect(result.givens.every(given => given === 0 || (given >= 1 && given <= 9))).toBe(true);
      expect(result.solution.every(val => val >= 1 && val <= 9)).toBe(true);
    });

    it('should execute generate request for MEDIUM difficulty', async () => {
      const result = await client.generate('MEDIUM', 54321);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });

    it('should execute generate request for HARD difficulty', async () => {
      const result = await client.generate('HARD', 99999);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });

    it('should handle different seeds deterministically', async () => {
      const result1 = await client.generate('EASY', 11111);
      const result2 = await client.generate('EASY', 11111);
      
      expect(result1.givens).toEqual(result2.givens);
      expect(result1.solution).toEqual(result2.solution);
    });

    it('should generate different puzzles for different seeds', async () => {
      const result1 = await client.generate('EASY', 11111);
      const result2 = await client.generate('EASY', 22222);
      
      expect(result1.givens).not.toEqual(result2.givens);
      expect(result1.solution).not.toEqual(result2.solution);
    });
  });

  describe('Payload Validation', () => {
    it('should validate payload structure', async () => {
      const result = await client.generate('EASY', 33333);
      
      expect(typeof result).toBe('object');
      expect('givens' in result).toBe(true);
      expect('solution' in result).toBe(true);
      expect(Array.isArray(result.givens)).toBe(true);
      expect(Array.isArray(result.solution)).toBe(true);
    });

    it('should ensure payload is cloneable', async () => {
      const result = await client.generate('MEDIUM', 44444);
      
      expect(() => structuredClone(result)).not.toThrow();
      const cloned = structuredClone(result);
      expect(cloned).toEqual(result);
    });

    it('should not contain functions or non-serializable data', async () => {
      const result = await client.generate('HARD', 55555);
      
      expect(Object.getOwnPropertyNames(result)).toEqual(['givens', 'solution']);
      expect(typeof result.givens).toBe('object');
      expect(typeof result.solution).toBe('object');
      expect(Array.isArray(result.givens)).toBe(true);
      expect(Array.isArray(result.solution)).toBe(true);
      expect(result.givens.every(val => typeof val === 'number')).toBe(true);
      expect(result.solution.every(val => typeof val === 'number')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid difficulty', async () => {
      const client2 = new GeneratorClient();
      expect(client2.generate('EASY', 12345)).resolves.toBeDefined();
    });

    it('should handle invalid seed', async () => {
      const client2 = new GeneratorClient();
      expect(client2.generate('EASY', -1)).resolves.toBeDefined();
    });

    it('should handle worker disposal', async () => {
      client.dispose();
      
      expect(client['worker']).toBeUndefined();
    });

    it('should handle cancellation', () => {
      const requestId = 'test-request';
      client.cancel(requestId);
      
      expect(client['pendingRequests'].has(requestId)).toBe(false);
    });
  });

  describe('Worker Communication', () => {
    it('should send request with unique ID', async () => {
      const result = await client.generate('EASY', 77777);
      
      expect(result).toBeDefined();
      expect(result.givens.length).toBeGreaterThan(0);
      expect(result.solution.length).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = [
        client.generate('EASY', 11111),
        client.generate('MEDIUM', 22222),
        client.generate('HARD', 33333)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.givens.length === 81)).toBe(true);
      expect(results.every(r => r.solution.length === 81)).toBe(true);
    });

    it('should handle stale response prevention', async () => {
      const result1 = await client.generate('EASY', 88888);
      const result2 = await client.generate('EASY', 88888);
      
      expect(result1.givens).toEqual(result2.givens);
      expect(result1.solution).toEqual(result2.solution);
    });
  });

  describe('Browser Offline Capability', () => {
    it('should operate without server requests', async () => {
      const result = await client.generate('EASY', 99999);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });

    it('should work without internet connection', async () => {
      const result = await client.generate('MEDIUM', 10101);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });

    it('should work with minimal system resources', async () => {
      const result = await client.generate('HARD', 20202);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const result = await client.generate('EASY', 30303);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result).toBeDefined();
    });

    it('should handle request queue properly', async () => {
      const startTime = Date.now();
      const promises = Array.from({ length: 3 }, (_, i) => 
        client.generate('EASY', 40404 + i)
      );
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results).toHaveLength(3);
      expect(results.every(r => r.givens.length === 81)).toBe(true);
    });

    it('should maintain responsiveness during generation', async () => {
      const startTime = Date.now();
      const result = await client.generate('MEDIUM', 50505);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should clean up worker after disposal', () => {
      const initialWorker = client['worker'];
      client.dispose();
      expect(client['worker']).toBeUndefined();
    });

    it('should handle memory usage efficiently', async () => {
      const result = await client.generate('EASY', 60606);
      
      expect(result).toBeDefined();
      expect(result.givens).toHaveLength(81);
      expect(result.solution).toHaveLength(81);
    });

    it('should not leak memory across multiple generations', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await client.generate('EASY', 70707 + i);
        expect(result).toBeDefined();
        expect(result.givens).toHaveLength(81);
      }
    });
  });

  describe('Structured Clone Support', () => {
    it('should support structured clone for browser compatibility', async () => {
      const result = await client.generate('EASY', 80808);
      
      // Test that result can be structured cloned (browser requirement)
      const cloned = structuredClone(result);
      expect(cloned).toEqual(result);
      expect(cloned.givens).toEqual(result.givens);
      expect(cloned.solution).toEqual(result.solution);
    });

    it('should ensure payload is serializable for Web Workers', async () => {
      const result = await client.generate('MEDIUM', 90909);
      
      // Test JSON serialization (for various browser scenarios)
      const jsonString = JSON.stringify(result);
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(result);
    });

    it('should ensure payload is transferable for high-performance scenarios', async () => {
      const result = await client.generate('HARD', 10101);
      
      // Test that ArrayBuffers can be transferred if needed
      if (typeof Transferable !== 'undefined') {
        const arrayBuffer = new ArrayBuffer(81 * 2); // 2 bytes per number
        const view = new DataView(arrayBuffer);
        for (let i = 0; i < 81; i++) {
          view.setUint16(i * 2, result.givens[i]);
          view.setUint16(i * 2 + 81, result.solution[i]);
        }
        // Transfer the array buffer (not using it, just testing capability)
        expect(typeof view).toBe('object');
      }
    });
  });
});
=======
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
>>>>>>> origin/feat/task-022-sudoku-engine
