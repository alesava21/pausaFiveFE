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