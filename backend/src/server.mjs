import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appConfig } from './config.mjs';
import { HttpError } from './lib/errors.mjs';
import { getPool, hasDatabase } from './lib/db.mjs';
import { contentRoutes } from './modules/content/routes.mjs';
import { authRoutes } from './modules/auth/routes.mjs';
import { progressRoutes } from './modules/progress/routes.mjs';

function buildServer() {
  const app = Fastify({
    logger: {
      level: appConfig.logLevel,
    },
  });

  const corsAllowlist = new Set(appConfig.corsAllowedOrigins);

  app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, corsAllowlist.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.decorateRequest('auth', null);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      request.log.warn({ err: error, code: error.code }, 'Request failed');
      reply.status(error.statusCode).send({
        message: error.message,
        code: error.code,
      });
      return;
    }

    request.log.error({ err: error }, 'Unhandled server error');
    reply.status(500).send({
      message: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
    });
  });

  app.get('/health', async () => ({
    ok: true,
    databaseConfigured: hasDatabase(),
  }));

  app.register(contentRoutes);
  app.register(authRoutes);
  app.register(progressRoutes);

  app.log.info(
    { corsAllowedOrigins: appConfig.corsAllowedOrigins },
    'CORS configured',
  );

  return app;
}

const app = buildServer();

async function start() {
  try {
    if (hasDatabase()) {
      const pool = getPool();
      await pool.query('select 1');
      app.log.info('Database connection verified');
    } else {
      app.log.warn('DATABASE_URL not set. Running in no-db mode for starter wiring.');
    }

    await app.listen({
      host: appConfig.host,
      port: appConfig.port,
    });

    app.log.info(`Lesson API listening on http://${appConfig.host}:${appConfig.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  app.log.info(`Received ${signal}. Shutting down.`);
  try {
    await app.close();
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
