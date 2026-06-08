import promClient from 'prom-client';
import { Request, Response, NextFunction } from 'express';
const config = require('../config');
import logger from './logger';

const register = new promClient.Registry();
register.setDefaultLabels({ service: 'backend', env: config.NODE_ENV });
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register, prefix: 'velsoie_' });

export const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'velsoie_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'velsoie_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestErrorTotal = new promClient.Counter({
  name: 'velsoie_http_request_errors_total',
  help: 'Total number of HTTP errors (status >= 500)',
  labelNames: ['method', 'route', 'status_code'],
});

export const dbPoolTotalConnections = new promClient.Gauge({
  name: 'velsoie_db_pool_total_connections',
  help: 'Total number of database pool connections',
  labelNames: ['env'],
});

export const dbPoolIdleConnections = new promClient.Gauge({
  name: 'velsoie_db_pool_idle_connections',
  help: 'Idle database pool connections',
  labelNames: ['env'],
});

export const dbPoolWaitingCount = new promClient.Gauge({
  name: 'velsoie_db_pool_waiting_count',
  help: 'Number of requests waiting for a database connection',
  labelNames: ['env'],
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrorTotal);
register.registerMetric(dbPoolTotalConnections);
register.registerMetric(dbPoolIdleConnections);
register.registerMetric(dbPoolWaitingCount);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();
  const end = httpRequestDurationSeconds.startTimer();

  res.once('finish', () => {
    const route = req.route?.path || req.path || 'unknown';
    const statusCode = String(res.statusCode);
    end({ method: req.method, route, status_code: statusCode });
    httpRequestTotal.inc({ method: req.method, route, status_code: statusCode });
    if (res.statusCode >= 500) {
      httpRequestErrorTotal.inc({ method: req.method, route, status_code: statusCode });
    }

    const diff = process.hrtime(start);
    const durationMs = diff[0] * 1000 + diff[1] / 1e6;
    if (durationMs >= config.LOG_SLOW_REQUESTS_MS) {
      logger.warn('Slow request detected', {
        method: req.method,
        route,
        statusCode,
        durationMs: Math.round(durationMs),
      });
    }
  });

  next();
}

export function refreshDbPoolMetrics(pool: any) {
  if (!pool || typeof pool.totalCount !== 'number') return;
  const labels = { env: config.NODE_ENV };
  dbPoolTotalConnections.set(labels, pool.totalCount);
  dbPoolIdleConnections.set(labels, pool.idleCount);
  dbPoolWaitingCount.set(labels, pool.waitingCount);
}

export function createMetricsHandler(pool?: any) {
  return async function metricsHandler(req: Request, res: Response) {
    try {
      if (pool) refreshDbPoolMetrics(pool);
      res.set('Content-Type', register.contentType);
      res.send(await register.metrics());
    } catch (err: any) {
      res.status(500).send(err.message);
    }
  };
}

export default register;

export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err: any) {
    res.status(500).send(err.message);
  }
}
