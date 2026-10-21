import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblemDto } from './api-contracts';

export type ApiErrorKind = 'problem' | 'http' | 'network' | 'client';
const messages: Readonly<Record<number, string>> = {
  0: 'Non riusciamo a contattare il server. Controlla la connessione e riprova.',
  400: 'I dati inviati non sono validi. Controllali e riprova.',
  401: 'La sessione non è più valida. Ricarica la pagina per continuare.',
  403: 'Questa operazione non è consentita. Ricarica la pagina prima di riprovare.',
  404: 'Il contenuto richiesto non è disponibile.',
  409: 'La partita è già conclusa oppure la sfida è scaduta. Ricarica per continuare.',
  422: 'La risposta non è valida. Controlla i dati inseriti e riprova.',
  429: 'Hai effettuato troppi tentativi. Attendi prima di riprovare.',
  503: 'Il servizio non è disponibile al momento. Riprova tra poco.',
};

/** Non conserva body, URL, cookie, token o cause provenienti dal backend. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    readonly status: number,
    readonly kind: ApiErrorKind,
  ) {
    super(messages[status] ?? 'Non siamo riusciti a completare l’operazione. Riprova più tardi.');
  }
}

function isProblem(value: unknown, status: number): value is ApiProblemDto {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    body['type'] === 'about:blank' &&
    body['status'] === status &&
    ['title', 'detail', 'instance', 'code', 'traceId'].every((key) => typeof body[key] === 'string')
  );
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!(error instanceof HttpErrorResponse)) return new ApiError(503, 'client');
  const mediaType = error.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  const kind =
    error.status === 0
      ? 'network'
      : mediaType === 'application/problem+json' && isProblem(error.error, error.status)
        ? 'problem'
        : 'http';
  return new ApiError(error.status, kind);
}
