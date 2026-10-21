import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function validateEndless(base = root) {
  const forbidden =
    /(?:allowed[_-]guesses|daily[_-]solutions|endless[_-]solutions|morphit[_-]snapshot)/i;
  for (const directory of ['public', 'src/assets']) {
    const path = resolve(base, directory);
    if (!existsSync(path)) continue;
    for (const name of readdirSync(path, { recursive: true })) {
      if (forbidden.test(name) || /(?:^|[/\\])word[/\\].*\.(?:json|txt|csv|tsv)$/i.test(name)) {
        throw new Error('Non pubblicare dizionari o liste di soluzioni negli asset browser.');
      }
    }
  }
  const angular = JSON.parse(readFileSync(resolve(base, 'angular.json'), 'utf8'));
  const assets = angular.projects.PausaFiveFE.architect.build.options.assets;
  if (
    assets.some(
      (asset) =>
        typeof asset === 'object' && /PausaFiveBE|resources\/word|data\/morph-it/.test(asset.input),
    )
  ) {
    throw new Error('La build browser non deve importare risorse lessicali server.');
  }
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateEndless();
  console.log('Asset Word OK: nessun dizionario o lista di soluzioni nel frontend.');
}
