import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import config from './config';
import logger, { requestLogFormat } from './utils/logger';
import { globalErrorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import contactsRoutes from './modules/contacts/contacts.routes';
import propertiesRoutes from './modules/properties/properties.routes';
import dealsRoutes from './modules/deals/deals.routes';
import tasksRoutes from './modules/tasks/tasks.routes';
import calendarRoutes from './modules/calendar/calendar.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import commissionsRoutes from './modules/commissions/commissions.routes';
import reportsRoutes from './modules/reports/reports.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import settingsRoutes from './modules/settings/settings.routes';
import locationsRoutes from './modules/locations/locations.routes';
import usersRoutes from './modules/users/users.routes';

const app = express();

// ---------------------------------------------------------------------------
// Security & parsing middleware
// ---------------------------------------------------------------------------

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow serving uploaded images cross-origin
}));

app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = requestLogFormat(req.method, req.originalUrl, res.statusCode, duration);
    if (res.statusCode >= 400) {
      logger.warn(logLine);
    } else {
      logger.info(logLine);
    }
  });
  next();
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Cok fazla istek gonderdiniz. Lutfen 15 dakika sonra tekrar deneyin.',
    },
  },
});

app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Static file serving for uploads
// ---------------------------------------------------------------------------

const uploadsDir = config.upload.uploadsDir;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.nodeEnv,
    },
  });
});

// ---------------------------------------------------------------------------
// API v1 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contacts', contactsRoutes);
app.use('/api/v1/properties', propertiesRoutes);
app.use('/api/v1/deals', dealsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/messaging', messagingRoutes);
app.use('/api/v1/commissions', commissionsRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/users', usersRoutes);

// ---------------------------------------------------------------------------
// 404 handler for unmatched routes
// ---------------------------------------------------------------------------

app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Istenen endpoint bulunamadi',
    },
  });
});

// ---------------------------------------------------------------------------
// Global error handler (must be last middleware)
// ---------------------------------------------------------------------------

app.use(globalErrorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  logger.info(`Emlak CRM sunucusu baslatildi - port: ${PORT} - ortam: ${config.server.nodeEnv}`);
  logger.info(`Saglik kontrolu: http://localhost:${PORT}/api/health`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function gracefulShutdown(signal: string) {
  logger.info(`${signal} sinyali alindi. Sunucu kapatiliyor...`);

  server.close((err) => {
    if (err) {
      logger.error('Sunucu kapatilirken hata olustu:', err);
      process.exit(1);
    }

    logger.info('Tum baglantilari kapatildi. Sunucu durduruldu.');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Zamanasimi - sunucu zorla kapatiliyor.');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Islenmemis Promise reddi:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Yakalanmamis hata:', error);
  gracefulShutdown('uncaughtException');
});

export default app;
