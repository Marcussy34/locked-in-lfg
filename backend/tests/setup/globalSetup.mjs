import { execSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..', '..');
const sqlDir = join(backendRoot, 'sql');
const composeFile = join(backendRoot, 'docker-compose.test.yml');

const TEST_DB_URL = 'postgresql://test:test@localhost:5433/lockedin_test';

async function waitForDb(maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const pool = new pg.Pool({ connectionString: TEST_DB_URL });
      await pool.query('SELECT 1');
      await pool.end();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Test database did not become ready in time');
}

async function runMigrations() {
  const files = (await readdir(sqlDir)).filter(f => f.endsWith('.sql')).sort();
  const pool = new pg.Pool({ connectionString: TEST_DB_URL });
  try {
    for (const file of files) {
      const sql = await readFile(join(sqlDir, file), 'utf8');
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}

// Check if DB is already running (e.g., CI service container)
async function isDbReady() {
  try {
    const pool = new pg.Pool({ connectionString: TEST_DB_URL });
    await pool.query('SELECT 1');
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

let startedDocker = false;

export async function setup() {
  if (await isDbReady()) {
    // DB already running (CI service container) — migrations already applied by CI workflow
    return;
  }

  // Local dev — start Docker
  execSync(`docker compose -f "${composeFile}" up -d --wait`, {
    stdio: 'pipe',
    cwd: backendRoot,
  });
  startedDocker = true;
  await waitForDb();
  await runMigrations();
}

export async function teardown() {
  if (!startedDocker) return;
  execSync(`docker compose -f "${composeFile}" down -v`, {
    stdio: 'pipe',
    cwd: backendRoot,
  });
}
