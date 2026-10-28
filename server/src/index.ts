import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb, connectDb } from './db.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  // DB connect pehle, taaki bina DB ke server request na le.
  await connectDb();

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'server listening');
  });

  function shutdown(signal: string): void {
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      closeDb()
        .catch((err: unknown) => logger.error({ err }, 'error closing db'))
        .finally(() => process.exit(0));
    });
    // Agar 10 sec mein band na ho to force exit.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'failed to start server');
  process.exit(1);
});
