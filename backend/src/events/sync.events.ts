import { EventEmitter } from 'events';

class SyncEventEmitter extends EventEmitter { }

export const syncEmitter = new SyncEventEmitter();

export const EVENTS = {
    RESULTS_UPDATED: 'RESULTS_UPDATED',
    SCHEDULE_UPDATED: 'SCHEDULE_UPDATED',
};
