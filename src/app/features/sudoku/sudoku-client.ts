import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  DailySudokuDto,
  SudokuFinishDto,
  SudokuFinishRequest,
  SudokuSessionDto,
} from '../../core/api/api-contracts';

@Injectable({ providedIn: 'root' })
export class SudokuClient {
  private readonly http = inject(HttpClient);

  daily() {
    return this.http.get<DailySudokuDto>('/api/v1/daily/sudoku');
  }

  openSession() {
    return this.http.post<SudokuSessionDto>('/api/v1/daily/sudoku/sessions', {});
  }

  finish(sessionId: string, board: readonly number[]) {
    const request: SudokuFinishRequest = { board: board as SudokuFinishRequest['board'] };
    return this.http.post<SudokuFinishDto>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}/sudoku/finish`,
      request,
    );
  }

  getSession(id: string) {
    return this.http.get<SudokuSessionDto>(`/api/v1/sessions/${encodeURIComponent(id)}`);
  }
}
