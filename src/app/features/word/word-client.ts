import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GameMode, WordGuessDto, WordSessionDto } from '../../core/api/api-contracts';

@Injectable({ providedIn: 'root' })
export class WordClient {
  private readonly http = inject(HttpClient);
  open(mode: GameMode, newGame = false) {
    const path = mode === 'DAILY' ? 'daily' : 'endless';
    return this.http.post<WordSessionDto>(
      `/api/v1/${path}/word/sessions`,
      mode === 'DAILY' ? {} : { newGame },
    );
  }
  session(id: string) {
    return this.http.get<WordSessionDto>(`/api/v1/sessions/${encodeURIComponent(id)}`);
  }
  guess(id: string, guess: string, key: string) {
    return this.http.post<WordGuessDto>(
      `/api/v1/sessions/${encodeURIComponent(id)}/word/guesses`,
      { guess },
      { headers: { 'Idempotency-Key': key } },
    );
  }
}
