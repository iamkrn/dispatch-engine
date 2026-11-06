import { createApp } from './app.js';
import { config } from './config.js';
import { closeDb, connectDb } from './db.js';
import { logger } from './logger.js';
import { createReservations } from './dispatch/reservations.js';
import { createRequestStore } from './requests/requestStore.js';
import { createAgentStore } from './state/agentStore.js';
import { createClientGateway } from './ws/clientGateway.js';
import { createSimulatorGateway } from './ws/simulatorGateway.js';

async function main(): Promise<void> {
  await connectDb();

  const agentStore = createAgentStore();
  const requestStore = createRequestStore();
  const reservations = createReservations();
  const app = createApp({
    agentStore,
    requestStore,
    reservations,
    onRequestUpdated: (request, reasons) =>
      clientGateway.broadcastRequest(request, reasons),
  });
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'server listening');
  });

    const simGateway = createSimulatorGateway({
    server,
    logger,
    onSnapshot(snapshot) {
      agentStore.applySnapshot(snapshot);
    },
  });
  const clientGateway = createClientGateway({ server, logger, agentStore });

  function shutdown(signal: string): void {
    logger.info({ signal }, 'shutting down');
     simGateway
      .close()
      .catch((err: unknown) => logger.error({ err }, 'error closing gateway'));
    clientGateway
      .close()
      .catch((err: unknown) => logger.error({ err }, 'error closing client gateway'));
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
