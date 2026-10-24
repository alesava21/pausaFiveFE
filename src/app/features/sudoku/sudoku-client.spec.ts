import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DailySudokuDto, SudokuFinishDto, SudokuSessionDto } from '../../core/api/api-contracts';
import { SudokuClient } from './sudoku-client';

const daily: DailySudokuDto = {
  puzzleId: 'puzzle-test',
  serverDate: '2026-10-21',
  nextResetAt: '2026-10-22T00:00:00+02:00',
  size: 9,
  difficulty: 'EASY',
  givens: [
    0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
};

const session: SudokuSessionDto = {
  sessionId: 'session-test',
  puzzleId: 'puzzle-test',
  mode: 'DAILY',
  status: 'ACTIVE',
  startedAt: '2026-10-21T12:00:00+02:00',
};

const finishResponse: SudokuFinishDto = {
  status: 'WON',
  completed: true,
  elapsedSeconds: 140,
  errors: 0,
};

describe('SudokuClient', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('GET /api/v1/daily/sudoku returns puzzle', () => {
    const client = TestBed.inject(SudokuClient);
    client.daily().subscribe((dto) => {
      expect(dto).toEqual(daily);
    });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/daily/sudoku').flush(daily);
  });

  it('POST /api/v1/daily/sudoku/sessions creates or resumes session', () => {
    const client = TestBed.inject(SudokuClient);
    client.openSession().subscribe((dto) => {
      expect(dto).toEqual(session);
    });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/daily/sudoku/sessions').flush(session);
  });

  it('POST /api/v1/sessions/{id}/sudoku/finish sends board with CSRF via interceptor', () => {
    const client = TestBed.inject(SudokuClient);
    const board = Array(81).fill(1);
    client.finish(session.sessionId, board).subscribe((dto) => {
      expect(dto).toEqual(finishResponse);
    });
    const req = TestBed.inject(HttpTestingController).expectOne(
      '/api/v1/sessions/session-test/sudoku/finish',
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ board });
    req.flush(finishResponse);
  });

  it('GET /api/v1/sessions/{id} recovers session state', () => {
    const client = TestBed.inject(SudokuClient);
    client.getSession(session.sessionId).subscribe((dto) => {
      expect(dto).toEqual(session);
    });
    TestBed.inject(HttpTestingController).expectOne('/api/v1/sessions/session-test').flush(session);
  });

  it('encodes sessionId in URL for special characters', () => {
    const client = TestBed.inject(SudokuClient);
    client.getSession('session with spaces').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/sessions/session%20with%20spaces')
      .flush(session);
    client.finish('session-with-dashes', []).subscribe();
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(
      (request) =>
        request.url.includes('session-with-dashes') && request.url.includes('/sudoku/finish'),
    );
    expect(req.request.url).toContain('/api/v1/sessions/session-with-dashes/sudoku/finish');
    req.flush(finishResponse);
  });
});
