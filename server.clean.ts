import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import os from 'os';
import 'dotenv/config';
import { dbConnect } from './lib/dbConnect.js';
import { Settings } from './models/models.js';
import { validateEnvOrExit } from './lib/validateEnv.js';
import * as cron from 'node-cron';

validateEnvOrExit();

const dev = process.env.NODE_ENV !== 'production';
const app = (next as any)({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);

    // Lightweight health endpoint
    try {
      const pathname = parsedUrl.pathname || '';
      if (pathname === '/health' || pathname === '/api/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
        return;
      }
    } catch (e) {
      // ignore and continue to Next handler
    }

    handle(req, res, parsedUrl);
  });

  // Cron job to trigger trip reminders
  let cronTask: cron.ScheduledTask | null = null;

  const startCronJob = async () => {
    try {
      await dbConnect();
      const setting = await Settings.findOne({ key: 'notification_cron_schedule' });
      const schedule = setting?.value || '*/5 * * * *';

      if (cronTask) {
        cronTask.stop();
        cronTask = null;
      }

      cronTask = cron.schedule(schedule, async () => {
        try {
          console.log('Running trip reminder cron job');
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/cron/send-trip-reminders`, { method: 'POST' });
        } catch (error) {
          console.error('Cron job error:', error);
        }
      });

      console.log(`Cron job started with schedule: ${schedule}`);
    } catch (error) {
      console.error('Failed to start cron job:', error);
    }
  };

  startCronJob();

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    const displayHost = process.env.NEXT_PUBLIC_HOSTNAME || 'localhost';
    console.log(`Server ready at http://${displayHost}:${PORT} (bind: 0.0.0.0:${PORT})`);

    try {
      const nets = os.networkInterfaces();
      const ips: string[] = [];
      Object.values(nets).forEach(ifaces => {
        if (!ifaces) return;
        ifaces.forEach(iface => {
          if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address!);
        });
      });
      ips.forEach(ip => console.log(`Accessible on LAN: http://${ip}:${PORT}`));
    } catch (e) {
      // ignore
    }
  });
});
