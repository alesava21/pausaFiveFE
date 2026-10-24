import { expect, test } from 'playwright/test';
import { verifyPuzzle } from '../src/app/features/sudoku/engine/sudoku-engine';
import type {} from '../src/testing/sudoku-generator-harness';

test('Worker modulo reale genera offline senza bloccare heartbeat e input', async ({
  page,
  context,
  browserName,
}) => {
  const workers: string[] = [];
  page.on('worker', (worker) => workers.push(worker.url()));
  await page.goto('/__sudoku-engine/');
  await expect(page.locator('#status')).toHaveText('Asset pronti');
  expect(workers).toHaveLength(1);
  const requests: string[] = [];
  context.on('request', (request) => requests.push(request.url()));
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Genera offline', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.sudokuHarness.running)).toBe(true);
  await page
    .getByRole('textbox', { name: 'Prova input' })
    .pressSequentially('prova offline', { delay: 10 });
  await expect(page.locator('#status')).toHaveText('Generazione offline completata');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const state = await page.evaluate(() => window.sudokuHarness);
  expect(state.error).toBeNull();
  expect(state.completed).toBe(true);
  expect(state.mainThreadGenerations).toBe(0);
  expect(state.inputEvents).toBe(13);
  expect(state.inputDuringGeneration).toBeGreaterThan(0);
  expect(state.heartbeat.length).toBeGreaterThan(2);
  expect(Math.max(...state.heartbeat)).toBeLessThanOrEqual(50);
  expect(state.longTasks).toEqual([]);
  if (browserName === 'chromium') expect(state.longTaskSupported).toBe(true);
  expect(state.puzzles).toHaveLength(6);
  for (const puzzle of state.puzzles) verifyPuzzle(puzzle);
  for (const index of [1, 3, 5]) expect(state.puzzles[index].fallback).toBe(true);
  expect(state.puzzles.some((puzzle) => !puzzle.fallback)).toBe(true);
  expect(requests).toEqual([]);
  console.log(
    JSON.stringify({
      browserName,
      workers,
      heartbeatCount: state.heartbeat.length,
      heartbeatTraceMs: state.heartbeat,
      inputDuringGeneration: state.inputDuringGeneration,
      mainThreadGenerations: state.mainThreadGenerations,
      fallbacks: state.puzzles.map((puzzle) => puzzle.fallback),
      maxHeartbeatMs: Math.max(...state.heartbeat),
      longTasks: state.longTasks,
      longTaskSupported: state.longTaskSupported,
      inputEvents: state.inputEvents,
      requests: requests.length,
    }),
  );
});

test('Worker reale ignora la richiesta cancellata e restituisce il livello nuovo offline', async ({
  page,
  context,
}) => {
  await page.goto('/__sudoku-engine/');
  await expect(page.locator('#status')).toHaveText('Asset pronti');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Prova cancellazione' }).click();
  await expect(page.locator('#status')).toHaveText('Cancellazione completata');
  const state = await page.evaluate(() => window.sudokuHarness);
  expect(state.error).toBeNull();
  expect(state.cancelled).toBe('CANCELLED');
  expect(state.puzzles).toHaveLength(1);
  expect(state.puzzles[0].difficulty).toBe('MEDIUM');
  verifyPuzzle(state.puzzles[0]);
});
