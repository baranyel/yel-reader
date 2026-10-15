// Runs every browser test against a production build served by `vite preview`.
// All network APIs (dictionary, translation, fonts) are mocked inside the tests.
// Usage: npm run e2e   (builds first)
import { preview } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SUITES = ['reading-flow.mjs', 'storage.mjs', 'review.mjs'];

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = server.resolvedUrls.local[0];
let failed = 0;
for (const suite of SUITES) {
  console.log(`\n── ${suite}`);
  // Async on purpose: the preview server runs in this process and must keep answering.
  const code = await new Promise((resolve) => {
    spawn(process.execPath, [fileURLToPath(new URL(suite, import.meta.url))], {
      stdio: 'inherit', env: { ...process.env, APP_URL: url },
    }).on('exit', resolve);
  });
  if (code !== 0) failed++;
}
await new Promise((resolve) => server.httpServer.close(resolve));
console.log(failed ? `\n${failed} suite(s) failed` : '\nAll browser tests passed');
process.exit(failed ? 1 : 0);
