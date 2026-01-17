import { io } from 'socket.io-client';
let socketInstance = null;
export function createSocket(options = {}) {
    if (typeof window === 'undefined') {
        throw new Error('createSocket can only be called in the browser');
    }
    if (socketInstance && socketInstance.connected)
        return socketInstance;
    // Use current origin so the client connects back to the same host the app is served from.
    const defaultSockets = {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        withCredentials: true,
    };
    const socks = { ...defaultSockets, ...options };
    const origin = `${window.location.protocol}//${window.location.host}`;
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
