/**
 * Socket.IO client utility — singleton pattern.
 * Connects to the Socket.IO server with Supabase JWT for authentication.
 * Used by DM and Group chat pages.
 */
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Get or create a Socket.IO connection.
 * Uses the Supabase JWT token for authentication.
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  return socket;
}

/**
 * Disconnect the current socket connection.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (without creating a new one).
 */
export function getCurrentSocket(): Socket | null {
  return socket;
}
