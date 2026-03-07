import { spawn } from 'node:child_process';
import process from 'node:process';

const root = '/Users/mustafamasetic/git/todo-app';
const port = process.env.SEED_PORT || '4100';
const baseUrl = `http://localhost:${port}`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, ...(opts.env || {}) }
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} failed with exit code ${code}`));
      }
    });
  });
}

async function waitForHealth(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Server did not become healthy at ${url} within ${timeoutMs}ms`);
}

async function main() {
  console.log('1) Recreating test-data and cleaning database...');
  await run('pnpm', ['run', 'create:data']);

  console.log('2) Building server...');
  await run('pnpm', ['--filter', './server', 'build']);

  console.log(`3) Starting fresh server on port ${port}...`);
  const server = spawn('node', ['server/dist/index.js'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: port }
  });

  let shuttingDown = false;
  const stopServer = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.kill('SIGTERM');
  };

  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopServer();
    process.exit(143);
  });

  try {
    await waitForHealth(baseUrl);
    console.log(`4) Seeding via API at ${baseUrl}...`);
    await run('pnpm', ['run', 'seed:data'], {
      env: { SEED_API_BASE_URL: baseUrl }
    });
    console.log('Seed completed successfully.');
  } finally {
    console.log('5) Stopping temporary server...');
    stopServer();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
