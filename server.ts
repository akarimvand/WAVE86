import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { getMySqlPool, closeMySqlPool } from './server/db';
import { ensureAllTablesExist } from './server/mysql';
import { runMigrations } from './server/migrations';
import { startBackupScheduler } from './server/backupScheduler';
import { configureSecurityMiddlewares, errorHandler } from './server/middleware';

// Route modules
import authRoutes from './server/routes/auth.routes';
import usersRoutes from './server/routes/users.routes';
import productsRoutes from './server/routes/products.routes';
import coursesRoutes from './server/routes/courses.routes';
import financeRoutes from './server/routes/finance.routes';
import clubRoutes from './server/routes/club.routes';
import messagingRoutes from './server/routes/messaging.routes';
import backupRoutes from './server/routes/backup.routes';
import uploadRoutes, { UPLOAD_DIR } from './server/routes/upload.routes';
import installRoutes from './server/routes/install.routes';
import syncRoutes from './server/routes/sync.routes';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Security Middlewares (Helmet, Rate Limiting)
  configureSecurityMiddlewares(app);

  // 2. Request Parsing with safe high limits for backups & attachments
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 3. Static Media and Uploads Serving
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOAD_DIR));
  app.use('/upload', express.static(UPLOAD_DIR));

  // 4. Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/courses', coursesRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/club', clubRoutes);
  app.use('/api/sms', messagingRoutes);
  app.use('/api/bale', messagingRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/install', installRoutes);
  app.use('/api/mysql', syncRoutes);

  // Readiness gate: first API requests wait for schema self-healing/migrations
  // to finish, so the initial page load can never race database bootstrap.
  const readyPromise = (async () => {
    const pool = getMySqlPool();
    await ensureAllTablesExist(pool);
    console.log('[Server] MySQL schema checked and verified successfully.');
    const migrationResult = await runMigrations(pool);
    console.log(`[Server] Migrations applied=${migrationResult.applied.length} skipped=${migrationResult.skipped.length}`);
    startBackupScheduler();
  })();
  readyPromise.catch((e: any) => console.warn('[Server] Bootstrap warning:', e.message || e));
  app.set('readyPromise', readyPromise);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const pool = getMySqlPool();
      await pool.query('SELECT 1');
      res.json({ status: 'ok', mysql: 'connected', timestamp: new Date().toISOString() });
    } catch {
      res.json({ status: 'ok', mysql: 'disconnected', timestamp: new Date().toISOString() });
    }
  });

  // 5. Explicit JSON 404 for any unmatched /api routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      dbConnected: false,
      error: `اندپوینت مورد نظر ${req.method} ${req.path} در سرور یافت نشد.`,
    });
  });

  // 6. Central Error Handler for API
  app.use('/api', errorHandler);

  // 6. Vite or Static Production Serving
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 7. Start Listening
  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Server] Climbing Club Backend running at http://0.0.0.0:${PORT} (warming up...)`);
  });

  // 8. Graceful Shutdown — no leaked connections on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received — shutting down gracefully...`);
    try {
      await closeMySqlPool();
    } finally {
      server.close(() => process.exit(0));
      // Hard-exit safety net if close hangs
      setTimeout(() => process.exit(0), 5000).unref();
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server Fatal Error]', err);
});
