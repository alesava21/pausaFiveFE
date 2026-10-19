// LMDB crashes during cache cleanup on macOS ARM64 with Node 24.16.0.
// Use Angular's built-in SQLite cache on this platform, keeping caching enabled.
if (process.platform === 'darwin' && process.arch === 'arm64') {
  process.env.NG_BUILD_CACHE_STORE ??= 'sqlite';
}

await import('../node_modules/@angular/cli/bin/ng.js');
