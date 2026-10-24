// Static build server ONLY for browser tests. Never used by production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist/PausaFiveFE/browser');
const harnessRoot = resolve('.angular/sudoku-harness/browser');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
await stat(resolve(root, 'sudoku-del-giorno/index.html'));
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const base = path.startsWith('/__sudoku-engine/') ? harnessRoot : root;
    const relative = base === harnessRoot ? path.slice('/__sudoku-engine'.length) : path;
    let target = resolve(base, `.${relative}`);
    if (target !== base && !target.startsWith(base + sep)) throw new Error('Path');
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const data = await readFile(target);
    res.writeHead(200, {
      'Content-Type': mime[extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Non trovato');
  }
});
server.listen(4307, '127.0.0.1');
for (const event of ['SIGINT', 'SIGTERM']) {
  process.on(event, () => server.close(() => process.exit(0)));
}
