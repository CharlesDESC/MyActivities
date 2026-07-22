import http from 'node:http';
import app from './app';
import { config } from './config';
import { initRealtime } from './realtime';

const server = http.createServer(app);

// Couche temps réel (messagerie) : broker Pub/Sub + gateway Socket.IO
initRealtime(server);

server.listen(config.port, () => {
  console.log(`MyActivities API running on http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/v1/docs`);
  console.log(`Socket.IO temps réel prêt sur ws://localhost:${config.port}`);
});
