// Node preserves empty environment entries; Windows PowerShell 5.1 does not.
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const item = process.argv[2] || 'filters';
if (!/^[a-z0-9-]+$/i.test(item)) throw new Error('Invalid verification item');
const folder = join(tmpdir(), 'deskjobs-v014', item);
mkdirSync(folder, { recursive: true });
const env = {
  ...process.env,
  SITE_ENV: 'local',
  DEMO_MODE: 'true',
  PLAYWRIGHT_TEST: 'false',
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  GOOGLE_INDEXING_SA_JSON: '',
  INDEXNOW_KEY: '',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3210',
  NEXT_PUBLIC_APPLY_DELAY_SECONDS: '2',
  TEST_BASE_URL: 'http://localhost:3210',
  SEO_BASE_URL: 'http://localhost:3210',
};
async function run(task) {
  const fd = openSync(join(folder, task.replaceAll(':', '-') + '.log'), 'w');
  const child = spawn('npm.cmd', ['run', task], {
    env,
    shell: true,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  closeSync(fd);
  if (code !== 0) throw new Error(`${task} failed; inspect ${folder}`);
  console.log(`PASS ${task}`);
}
for (const task of ['lint', 'typecheck', 'test:unit', 'build']) await run(task);
const fd = openSync(join(folder, 'server.log'), 'w');
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--port', '3210'],
  { env, stdio: ['ignore', fd, fd], windowsHide: true },
);
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch('http://localhost:3210/api/public/jobs.json?limit=1', {
        signal: AbortSignal.timeout(2000),
      });
      const payload = await response.json();
      if (
        response.ok &&
        payload.jobs?.[0]?.slug === 'customer-support-associate-northstar-services-bengaluru-s1'
      ) {
        ready = true;
        break;
      }
    } catch {
      /* local server is starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Local fixture readiness check failed');
  for (const task of ['test:ui', 'seo:check']) await run(task);
} finally {
  server.kill();
  closeSync(fd);
}
console.log(`PASS ${item}; logs: ${folder}`);
