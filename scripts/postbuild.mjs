// Create a copy of index.html as 404.html for GitHub Pages SPA fallback
import { copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dist = resolve(__dirname, '..', 'dist');

try {
  await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'));
  console.log('Created dist/404.html for SPA fallback');
} catch (err) {
  console.error('Failed to create 404.html', err);
  process.exitCode = 1;
}
