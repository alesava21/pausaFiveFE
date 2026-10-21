import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function validateWords(words, minimum = 100) {
  if (!Array.isArray(words) || words.length < minimum || minimum < 1) {
    throw new Error('Dizionario vuoto o insufficiente.');
  }
  const unique = new Set();
  for (const word of words) {
    if (typeof word !== 'string' || word.length !== 5 || !/^[A-Z]{5}$/.test(word)) {
      throw new Error('Il dizionario deve contenere solo parole di cinque lettere A-Z maiuscole.');
    }
    if (unique.has(word)) throw new Error('Parola duplicata nel dizionario.');
    unique.add(word);
  }
  if (words.join('\n') !== [...words].sort().join('\n')) {
    throw new Error('Ordinare il dizionario alfabeticamente.');
  }
  return unique;
}

export function validateSeparation(guesses, daily, endless) {
  const allowed = validateWords(guesses);
  const secret = validateWords(daily);
  const publicWords = validateWords(endless);
  if ([...secret].some((word) => !allowed.has(word))) {
    throw new Error('Soluzioni daily non presenti nei tentativi ammessi.');
  }
  if ([...publicWords].some((word) => !allowed.has(word) || secret.has(word))) {
    throw new Error('Set endless incoerente o sovrapposto alle soluzioni daily.');
  }
}

export function validateEndless() {
  const words = JSON.parse(
    readFileSync(resolve(root, 'src/assets/word/endless-solutions.json'), 'utf8'),
  );
  validateWords(words);
  return words;
}

function readSnapshot(backend, name) {
  const text = readFileSync(resolve(backend, 'src/main/resources/word', `${name}.txt`), 'utf8');
  if (!text.endsWith('\n') || text.includes('\r'))
    throw new Error('Usare UTF-8 e righe LF terminate.');
  return text.slice(0, -1).split('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 0 && (args.length !== 2 || args[0] !== '--backend')) {
      throw new Error('Uso: node tools/validate-dictionary.mjs [--backend ../PausaFiveBE]');
    }
    const endless = validateEndless();
    if (args.length) {
      const guesses = readSnapshot(args[1], 'allowed_guesses');
      const daily = readSnapshot(args[1], 'daily_solutions');
      validateSeparation(guesses, daily, endless);
      console.log(
        `Dizionari OK: ${guesses.length} tentativi, ${daily.length} daily, ${endless.length} endless disgiunte.`,
      );
    } else {
      console.log(`Dizionario endless OK: ${endless.length} parole.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
