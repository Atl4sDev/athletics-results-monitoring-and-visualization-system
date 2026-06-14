import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? ''

let socket: Socket | null = null

/**
 * Returns the shared Socket.io instance, creating it on first call.
 * The socket is created with `autoConnect: false` — callers must call
 * `socket.connect()` themselves (done inside `useCompetitionSocket`).
 */
export function getSocket(): Socket {
  if (socket === null) {
    socket = io(SOCKET_URL, { autoConnect: false })
  }
  return socket
}
