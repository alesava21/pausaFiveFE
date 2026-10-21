import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { validateEndless } from './validate-dictionary.mjs';

test('il frontend reale non pubblica il lessico server', () => {
  assert.equal(validateEndless(), true);
});

test('la build rifiuta liste nascoste negli asset o importate dal backend', () => {
  const root = mkdtempSync(join(tmpdir(), 'pausa5-word-assets-'));
  try {
    const config = (assets) =>
      JSON.stringify({
        projects: { PausaFiveFE: { architect: { build: { options: { assets } } } } },
      });
    writeFileSync(join(root, 'angular.json'), config([]));
    mkdirSync(join(root, 'public/word'), { recursive: true });
    writeFileSync(join(root, 'public/word/daily_solutions.txt'), 'GATTO\n');
    assert.throws(() => validateEndless(root));
    rmSync(join(root, 'public'), { recursive: true });
    writeFileSync(
      join(root, 'angular.json'),
      config([{ input: '../PausaFiveBE/src/main/resources/word' }]),
    );
    assert.throws(() => validateEndless(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
