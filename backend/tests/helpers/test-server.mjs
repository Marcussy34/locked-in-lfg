import { buildServer } from '../../src/server.mjs';

export async function createTestServer() {
  const app = buildServer();
  await app.ready();
  return app;
}

export async function closeTestServer(app) {
  await app.close();
}
