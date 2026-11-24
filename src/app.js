import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { createTelegram } from './telegram.js';

export function createApp({ db, cfg, fetchImpl = globalThis.fetch, log = console.log }) {
  const app = express();
  const telegram = createTelegram(cfg, fetchImpl);
  if (cfg.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: cfg.production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cookieParser());

  app.use('/api', publicRouter({ db, cfg, telegram, log }));
  app.use('/api/admin', adminRouter({ db, cfg, telegram, log, fetchImpl }));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Topilmadi.' }));

  app.use('/uploads', express.static(cfg.uploadsDir, { maxAge: '30d', fallthrough: false }));
  app.use(express.static(cfg.publicDir, {
    extensions: ['html'],
    setHeaders(res, file) {
      if (/\.(jpg|png|webp|svg|mp4|woff2?)$/.test(file)) res.set('cache-control', 'public, max-age=604800');
      else res.set('cache-control', 'no-cache');
    },
  }));

  app.use((req, res) => res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Topilmadi</title><p style="font-family:sans-serif;padding:40px">Sahifa topilmadi. <a href="/">Bosh sahifa</a></p>'));
  app.use((err, _req, res, _next) => {
    log(err.stack || err.message);
    if (err.status === 404 || err.statusCode === 404) return res.status(404).send('Topilmadi');
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: "Noto'g'ri so'rov." });
    res.status(500).json({ error: 'Server xatosi.' });
  });

  return { app, telegram };
}
