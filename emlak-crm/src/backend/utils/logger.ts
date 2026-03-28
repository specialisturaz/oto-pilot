import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}${metaStr}`;
  }
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: !isProduction }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

if (isProduction) {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'emlak-crm' },
  transports,
  exitOnError: false,
});

export const requestLogFormat = (method: string, url: string, statusCode: number, duration: number): string => {
  return `${method} ${url} ${statusCode} - ${duration}ms`;
};

export default logger;
