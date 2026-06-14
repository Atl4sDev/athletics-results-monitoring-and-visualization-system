import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSockets } from './sockets/socket.manager';

const server = http.createServer(app);

initSockets(server);

server.listen(env.PORT, () => {
    console.log(`Server started on port ${env.PORT}`);
});