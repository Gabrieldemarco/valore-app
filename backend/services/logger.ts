
// services/logger.js - Logging estructurado con Winston
import fs from 'fs';
import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize } = winston.format;

const logsPath = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
}

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    new winston.transports.File({
      filename: path.join(logsPath, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsPath, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV === 'test') {
  logger.transports.forEach(t => { t.silent = true; });
}

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

export default logger;
