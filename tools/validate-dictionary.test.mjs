import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEndless, validateSeparation, validateWords } from './validate-dictionary.mjs';

test('lo snapshot pubblico contiene almeno cento parole canoniche', () => {
  assert.ok(validateEndless().length >= 100);
});

test('rifiuta liste vuote, insufficienti, duplicati e ordine instabile', () => {
  for (const words of [null, {}, [], ['ACQUA'], ['ACQUA', 'ACQUA'], ['CIELO', 'ACQUA']]) {
    assert.throws(() => validateWords(words, 2));
  }
});

test('rifiuta minuscole, spazi, lunghezze errate e Unicode ambiguo', () => {
  for (const word of [
    null,
    12345,
    'acqua',
    'Acqua',
    ' ACQUA',
    'ACQUA ',
    'ACQUA\n',
    'ACQU',
    'ACQUAA',
    'ACQU1',
    'CITTÀ',
    'citta\u0300',
    'ＡＣＱＵＡ',
    'ſERPE',
    'fıume',
    'AßAA',
    'ACQ😀',
    'A\u200bCQUA',
  ]) {
    assert.throws(() => validateWords([word], 1));
  }
});

const daily = Array.from(
  { length: 100 },
  (_, i) =>
    `AAA${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`,
);
const endless = daily.map((word) => `B${word.slice(1)}`);
const allowed = [...daily, ...endless];

test('verifica subset e separazione daily/endless', () => {
  assert.doesNotThrow(() => validateSeparation(allowed, daily, endless));
  assert.throws(() => validateSeparation(allowed.slice(1), daily, endless));
  assert.throws(() => validateSeparation(allowed, daily, daily));
  assert.throws(() => validateSeparation(daily, daily, endless));
});
