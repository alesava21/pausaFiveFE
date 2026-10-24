import { wrap } from 'comlink';
import { SudokuGeneratorWorker } from './generator.worker';
import { SudokuBoardImpl } from './sudoku-engine';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface PuzzlePayload {
  readonly givens: readonly number[];
  readonly solution: readonly number[];
}

export interface WorkerRequest {
  readonly id: string;
  readonly type: 'generate' | 'countSolutions';
  readonly payload: {
    difficulty?: Difficulty;
    seed?: number;
    board?: number[];
    max?: number;
  };
}

export interface WorkerResponse<T> {
  readonly id: string;
  readonly type: 'success' | 'error';
  readonly payload: T;
}

export class GeneratorClient {
  private worker?: SudokuGeneratorWorker;
  private pendingRequests = new Map<string, (result: any) => void>();
  private nextRequestId = 0;

  async initWorker(): Promise<void> {
    if (!this.worker) {
      const workerBlob = new Blob([`
        import { expose } from 'https://esm.run/comlink';
        ${await fetch('file:///Users/alessandrosava/.ao/data/worktrees/pausa5/task-022-fallback/PausaFiveFE/src/app/features/sudoku/engine/generator.worker.ts').then(r => r.text())}
      `], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);
      const worker = new Worker(workerUrl);
      this.worker = wrap(worker) as SudokuGeneratorWorker;
    }
  }

  generate(difficulty: Difficulty, seed: number): Promise<PuzzlePayload> {
    return this.executeRequest<"generate", PuzzlePayload>({ type: 'generate', difficulty, seed });
  }

  countSolutions(board: SudokuBoardImpl, max: number = 2): Promise<number> {
    return this.executeRequest<"countSolutions", number>({ type: 'countSolutions', board: board.cells, max });
  }

  private async executeRequest<T extends WorkerRequest['type'], R>(
    request: WorkerRequest
  ): Promise<R> {
    await this.initWorker();

    return new Promise((resolve, reject) => {
      const requestId = (this.nextRequestId++).toString();
      const pendingRequest: WorkerRequest = { ...request, id: requestId };

      this.pendingRequests.set(requestId, (response: any) => {
        if (response.type === 'success') {
          resolve(response.payload);
        } else {
          reject(new Error(response.payload.message || 'Worker error'));
        }
        this.pendingRequests.delete(requestId);
      });

      if (this.worker) {
        this.sendRequestToWorker(pendingRequest);
      } else {
        reject(new Error('Worker not initialized'));
      }
    });
  }

  private async sendRequestToWorker(request: WorkerRequest): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    try {
      const response = await this.executeWorkerRequest(request);
      const callback = this.pendingRequests.get(request.id);
      if (callback) {
        callback(response);
      }
    } catch (error) {
      const callback = this.pendingRequests.get(request.id);
      if (callback) {
        callback({
          id: request.id,
          type: 'error',
          payload: { message: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }
  }

  private async executeWorkerRequest(request: WorkerRequest): Promise<any> {
    switch (request.type) {
      case 'generate':
        const result = await this.worker.generate(request.payload.difficulty!, request.payload.seed!);
        return { id: request.id, type: 'success', payload: result };
      case 'countSolutions':
        const count = await this.worker.countSolutions(request.payload.board!, request.payload.max!);
        return { id: request.id, type: 'success', payload: count };
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  cancel(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }

  dispose(): void {
    if (this.worker) {
      this.worker = undefined;
    }
  }
}

export const generatorClient = new GeneratorClient();