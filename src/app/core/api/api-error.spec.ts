import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError, toApiError } from './api-error';

function failure(
  status: number,
  contentType = 'application/problem+json; charset=UTF-8',
  bodyStatus = status,
) {
  return new HttpErrorResponse({
    status,
    headers: new HttpHeaders({ 'Content-Type': contentType }),
    error: {
      type: 'about:blank',
      title: 'INTERNAL_SECRET',
      detail: 'INTERNAL_SECRET',
      status: bodyStatus,
      instance: '/private/INTERNAL_SECRET',
      code: 'INTERNAL_SECRET',
      traceId: 'INTERNAL_SECRET',
    },
  });
}

describe('Errori API sanitizzati', () => {
  it.each([
    [401, 'La sessione non è più valida.'],
    [403, 'Questa operazione non è consentita.'],
    [409, 'La partita è già conclusa oppure la sfida è scaduta.'],
    [422, 'La risposta non è valida.'],
    [429, 'Hai effettuato troppi tentativi.'],
    [503, 'Il servizio non è disponibile al momento.'],
  ])('traduce %i senza conservare dettagli sensibili', (status, message) => {
    const error = toApiError(failure(status));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(status);
    expect(error.kind).toBe('problem');
    expect(error.message).toContain(message);
    expect(JSON.stringify(error) + error.stack).not.toContain('INTERNAL_SECRET');
  });

  it.each(['text/html', 'application/json', 'application/problem+json-other'])(
    'non accetta %s come Problem Details',
    (media) => {
      expect(toApiError(failure(403, media)).kind).toBe('http');
    },
  );
  it('non accetta status incoerenti o body non strutturati', () => {
    expect(toApiError(failure(403, 'application/problem+json', 500)).kind).toBe('http');
    expect(
      toApiError(new HttpErrorResponse({ status: 503, error: '<script>SECRET</script>' })).kind,
    ).toBe('http');
  });
  it('distingue rete e fallback sconosciuti senza mostrare il body', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).kind).toBe('network');
    expect(toApiError(failure(500)).message).toContain('Non siamo riusciti');
    expect(toApiError(new Error('SECRET')).message).not.toContain('SECRET');
  });
});
