/**
 * Socket.IO client utility — DEPRECATED.
 * Real-time messaging now uses Supabase Realtime.
 * Kept as empty exports for backwards compatibility.
 */

export function getSocket(_token: string): any {
  return null;
}

export function disconnectSocket(): void {}

export function getCurrentSocket(): any {
  return null;
}
