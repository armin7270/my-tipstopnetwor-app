#!/usr/bin/env node
/**
 * Minimal zero-dependency static server for the production build.
 *
 *   npm run build && npm start            # http://127.0.0.1:8080
 *   PORT=3000 npm start                   # custom port
 *   node scripts/serve.mjs some-other-dir # custom dist directory
 *
 * Implements SPA fallback, immutable caching for /assets, and the same
 * hardening headers used by the Vercel/Netlify/Docker targets.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? process.env.SERVE_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

const indexPath = join(root, 'index.html');
if (!existsSync(indexPath)) {
  console.error(`[serve] ${indexPath} not found — run "npm run build" first.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  const candidate = normalize(join(root, pathname));
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let filePath = candidate;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  // SPA fallback for client-side routes.
  if (!existsSync(filePath)) filePath = indexPath;

  const ext = extname(filePath).toLowerCase();
  const immutable = filePath.includes(`${sep}assets${sep}`);
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Length': statSync(filePath).size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[serve] ${root}`);
  console.log(`[serve] listening on http://${host}:${port}`);
});
