import { expect, test, type Page } from 'playwright/test';
import { active, daily, now, solution } from '../src/testing/fixtures/sudoku-daily';

// These are UI/HTTP contract tests with controlled API responses, not a replacement
// for the PostgreSQL security/solution checks implemented in backend TASK-020.
async function api(page: Page, mode: 'normal' | 'lost' | 'network' | 'expired' = 'normal') {
  await page.clock.setFixedTime(new Date(now));
  let status = 'ACTIVE';
  const requests: { method: string; path: string; board?: number[] }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const payload = req.method() === 'POST' ? req.postDataJSON() : undefined;
    requests.push({ method: req.method(), path, board: payload?.board });
    const json = (body: unknown, code = 200) => route.fulfill({ status: code, json: body });
    if (path === '/api/v1/daily/sudoku') return json(daily);
    if (path === '/api/v1/csrf')
      return json({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' });
    if (req.method() === 'POST') {
      if (req.headers()['x-csrf-token'] !== 'test-csrf-token') return json({}, 403);
      if (path === '/api/v1/daily/sudoku/sessions') return json({ ...active, status });
      if (path.endsWith('/sudoku/finish')) {
        const posts = requests.filter((r) => r.path.endsWith('/sudoku/finish'));
        if (mode === 'expired') {
          status = 'EXPIRED';
          return json({}, 409);
        }
        if (posts.length === 1 && ['lost', 'network'].includes(mode)) {
          if (mode === 'lost') status = 'WON';
          return route.abort('failed');
        }
        if (JSON.stringify(payload.board) !== JSON.stringify(solution)) return json({}, 422);
        status = 'WON';
        return json({ status, completed: true, elapsedSeconds: 140, errors: 0 });
      }
    }
    if (path === `/api/v1/sessions/${active.sessionId}`) return json({ ...active, status });
    throw new Error(`API inattesa: ${req.method()} ${path}`);
  });
  return requests;
}

async function open(page: Page) {
  await page.goto('/sudoku-del-giorno');
  await expect(page.getByRole('gridcell')).toHaveCount(81);
}

async function fill(page: Page) {
  for (let i = 0; i < 81; i++) {
    if (daily.givens[i]) continue;
    const cell = page.getByRole('gridcell').nth(i);
    await cell.click();
    await cell.press(String(solution[i]));
    await expect(cell).toHaveAttribute('aria-label', new RegExp(`valore ${solution[i]}`));
  }
}

const finishes = (requests: Awaited<ReturnType<typeof api>>) =>
  requests.filter((r) => r.path.endsWith('/sudoku/finish'));

test('risolve via UI e invia81 valori con CSRF prima di mostrare la vittoria', async ({ page }) => {
  const requests = await api(page);
  await open(page);
  await fill(page);
  expect(finishes(requests)).toHaveLength(0);
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sudoku completato!' })).toBeVisible();
  expect(finishes(requests)).toHaveLength(1);
  expect(finishes(requests)[0].board).toEqual([...solution]);
});

test('note, undo e focus/click restano corretti dopo refresh', async ({ page }) => {
  const requests = await api(page);
  await open(page);
  const cell = page.getByRole('gridcell').nth(10);
  await cell.focus();
  await cell.click();
  await expect(cell).toBeFocused();
  await expect(cell).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(cell).toHaveAttribute('aria-label', /valore 7/);
  const next = page.getByRole('gridcell').nth(11);
  await next.click();
  await page.getByRole('button', { name: 'Attiva modalità note', exact: true }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(next).toHaveAttribute('aria-label', /note: 2/);
  await page.reload();
  await expect(cell).toHaveAttribute('aria-label', /valore 7/);
  await expect(next).toHaveAttribute('aria-label', /note: 2/);
  await page.getByRole('button', { name: 'Annulla ultima mossa (Ctrl+Z)', exact: true }).click();
  await expect(next).not.toHaveAttribute('aria-label', /note:/);
  await page.getByRole('button', { name: 'Annulla ultima mossa (Ctrl+Z)', exact: true }).click();
  await expect(cell).toHaveAttribute('aria-label', /vuota/);
  expect(finishes(requests)).toHaveLength(0);
});

test('indizi immutabili e layout reale senza overflow a320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const requests = await api(page);
  await open(page);
  const given = page.getByRole('gridcell').first();
  await given.click();
  await given.press('9');
  await given.press('Backspace');
  await expect(given).toHaveText('5');
  await expect(page.getByRole('button', { name: '9', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Cancella', exact: true })).toBeDisabled();
  const cell = page.getByRole('gridcell').nth(2);
  await cell.click();
  await cell.press('ArrowDown');
  await expect(page.getByRole('gridcell').nth(11)).toBeFocused();
  const bounds = await page.getByRole('grid').boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(200);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('grid').getByRole('row')).toHaveCount(9);
  expect(
    await page
      .getByRole('gridcell')
      .nth(3)
      .evaluate((el) => getComputedStyle(el).borderLeftWidth),
  ).toBe('2px');
  await page.screenshot({
    path: `test-results/sudoku-320-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(finishes(requests)).toHaveLength(0);
});

test('422 conserva i numeri e permette di correggere prima del nuovo finish', async ({ page }) => {
  const requests = await api(page);
  await open(page);
  await fill(page);
  const cell = page.getByRole('gridcell').nth(2);
  await cell.click();
  await cell.press('1');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(
    page.getByText('Controlla i numeri inseriti: la soluzione non è corretta.'),
  ).toBeVisible();
  await expect(cell).toHaveAttribute('aria-label', /valore 1/);
  await expect(page.getByRole('heading', { name: 'Sudoku completato!' })).toHaveCount(0);
  await cell.click();
  await cell.press('4');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sudoku completato!' })).toBeVisible();
  expect(finishes(requests)).toHaveLength(2);
});

test('409 scaduta rimuove la griglia e propone la sfida corrente', async ({ page }) => {
  const requests = await api(page, 'expired');
  await open(page);
  await fill(page);
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Apri la sfida di oggi', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(0);
  expect(finishes(requests)).toHaveLength(1);
});

test('risposta persa recupera WON senza duplicare il finish', async ({ page }) => {
  const requests = await api(page, 'lost');
  await open(page);
  await fill(page);
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await page.getByRole('button', { name: 'Riprova verifica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sudoku completato!' })).toBeVisible();
  expect(finishes(requests)).toHaveLength(1);
});

test('rete: recupera ACTIVE e invia la board corretta dopo modifica', async ({ page }) => {
  const requests = await api(page, 'network');
  await open(page);
  await fill(page);
  const cell = page.getByRole('gridcell').nth(2);
  await cell.click();
  await cell.press('1');
  await page.getByRole('button', { name: 'Verifica', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Riprova verifica', exact: true })).toBeVisible();
  await cell.click();
  await cell.press('4');
  await page.getByRole('button', { name: 'Riprova verifica', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sudoku completato!' })).toBeVisible();
  expect(finishes(requests)).toHaveLength(2);
  expect(finishes(requests)[1].board).toEqual([...solution]);
  const firstPost = requests.findIndex((r) => r.path.endsWith('/sudoku/finish'));
  expect(requests[firstPost + 1].path).toBe(`/api/v1/sessions/${active.sessionId}`);
});
