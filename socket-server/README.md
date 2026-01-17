# Socket Server (Railway) — Deployment Notes

This folder contains the standalone Socket.IO server intended to run on Railway (or any Node host).

Quick goal: accept WebSocket connections from your Vercel-hosted Next app and handle realtime booking events.

Environment variables
- `PORT` or `SOCKET_PORT` — port to listen on (Railway sets this automatically).
- `MONGODB_URI` — your MongoDB connection string (required).
- `ALLOWED_ORIGINS` — comma-separated list of allowed origins for CORS. Examples:
  - `https://project-3.vercel.app`
  - `https://project-3-bus-management-production.up.railway.app` (if you need to allow the Railway origin)
  - `*.vercel.app` (wildcard for Vercel deployments)
  - `*` (allow all — not recommended in production)

How it works
- The server reads `ALLOWED_ORIGINS` and performs wildcard-aware origin checks. If `ALLOWED_ORIGINS` is empty, all origins are allowed.

Vercel setup (client)
1. In your Vercel project, open **Settings → Environment Variables**.
2. Add a new variable:
   - Name: `NEXT_PUBLIC_SOCKET_ORIGIN`
   - Value: `https://project-3-bus-management-production.up.railway.app`
   - Environment: `Production` (and `Preview` if you want previews to connect)
3. Redeploy your Vercel site.

Railway setup (socket server)
1. In Railway project settings, add `ALLOWED_ORIGINS` with a value like `*.vercel.app` (or the explicit Vercel domain).
2. Ensure `MONGODB_URI` is set in Railway env.
3. Restart the Railway service.

Testing
- After redeploying Vercel and restarting Railway:
  - Open the site, open DevTools → Network → filter `WS` to confirm the WebSocket connection.
  - Check browser console for socket connection logs.

Security
- Consider adding an authentication token on connect for production. If desired, I can implement a basic token check (server + client) as a follow-up.

Start command
```bash
node index.js
```
