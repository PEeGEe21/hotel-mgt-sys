'use client';

import { io, Socket } from 'socket.io-client';

let realtimeSocket: Socket | null = null;

function getRealtimeBaseUrl() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  return configuredApiUrl.replace(/\/api\/v1\/?$/, '');
}

export function getRealtimeSocket() {
  if (typeof window === 'undefined') return null;

  if (!realtimeSocket) {
    realtimeSocket = io(`${getRealtimeBaseUrl()}/realtime`, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
    });
  }

  return realtimeSocket;
}
