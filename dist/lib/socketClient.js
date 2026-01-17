import { io } from 'socket.io-client';
let socketInstance = null;
export function createSocket(options = {}) {
    if (typeof window === 'undefined') {
        throw new Error('createSocket can only be called in the browser');
    }
    if (socketInstance && socketInstance.connected)
        return socketInstance;
    // Always use NEXT_PUBLIC_SOCKET_ORIGIN if set (for Vercel → Railway), else fallback to window.location.origin (for local/dev)
    const defaultSockets = {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        withCredentials: true,
    };
    const socks = { ...defaultSockets, ...options };
    const envOrigin = (typeof window !== 'undefined' && window.NEXT_PUBLIC_SOCKET_ORIGIN) || process.env.NEXT_PUBLIC_SOCKET_ORIGIN;
    const origin = envOrigin || `${window.location.protocol}//${window.location.host}`;
    socketInstance = io(origin, socks);
    return socketInstance;
}
export function getSocket() {
    return socketInstance;
}
export function disconnectSocket() {
    if (socketInstance) {
        try {
            socketInstance.disconnect();
        }
        catch (e) {
            // ignore
        }
        socketInstance = null;
    }
}
