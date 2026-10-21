/** Risoluzione rispetto all’origin, indipendente da <base> e senza globali browser. */
export function sameOriginApiUrl(value: string, origin: string): URL | null {
  try {
    if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) return null;
    const url = new URL(value, origin + '/');
    return /^https?:$/.test(url.protocol) &&
      url.origin === origin &&
      !url.username &&
      !url.password &&
      (url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/'))
      ? url
      : null;
  } catch {
    return null;
  }
}
