import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { syncEmitter, EVENTS } from '../events/sync.events';
import { mapHeatRow } from '../utils/public.mapper';

let io: Server;

export const initSockets = (httpServer: HttpServer): void => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        socket.on('join_competition', (competitionId: string) => {
            const roomName = `comp_${competitionId}`;
            socket.join(roomName);
            console.log(`[Socket.io] Client ${socket.id} joined room: ${roomName}`);
        });

        socket.on('leave_competition', (competitionId: string) => {
            const roomName = `comp_${competitionId}`;
            socket.leave(roomName);
            console.log(`[Socket.io] Client ${socket.id} left room: ${roomName}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });

    syncEmitter.on(EVENTS.RESULTS_UPDATED, (payload: { competitionId: string, heat: any }) => {
        const roomName = `comp_${payload.competitionId}`;
        io.to(roomName).emit('live_results', mapHeatRow(payload.heat));
        console.log(`[Socket.io] Pushed 'live_results' to room ${roomName}`);
    });

    // Sends a lightweight ping — clients re-fetch the schedule via REST rather than receiving the full payload.
    syncEmitter.on(EVENTS.SCHEDULE_UPDATED, (payload: { competitionId: string }) => {
        const roomName = `comp_${payload.competitionId}`;
        io.to(roomName).emit('schedule_changed', { timestamp: new Date().toISOString() });
        console.log(`[Socket.io] Pushed 'schedule_changed' to room ${roomName}`);
    });

    console.log('WebSocket manager initialized');
};
