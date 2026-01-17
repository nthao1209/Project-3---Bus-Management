import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function createSocket(options: any = {}): Socket {
  if (typeof window === 'undefined') {
    throw new Error('createSocket can only be called in the browser');
  }

  if (socketInstance && socketInstance.connected) return socketInstance;

  // Use current origin so the client connects back to the same host the app is served from.
  const origin = `${window.location.protocol}//${window.location.host}`;

  socketInstance = io(origin, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnectionAttempts: 5,
    ...options,
  });

  return socketInstance;
}

export function getSocket(): Socket | null {
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    try {
      socketInstance.disconnect();
    } catch (e) {
      // ignore
    }
    socketInstance = null;
  }
}
