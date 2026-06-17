const LOG_PREFIX = '[Velsoie]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = (): boolean =>
  typeof window !== 'undefined' && (window as any).__ENV?.NODE_ENV !== 'production'
  && !import.meta.env?.PROD;

function log(level: LogLevel, ...args: unknown[]) {
  if (level === 'debug' && !isDev()) return;
  const fn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : level === 'info' ? console.info
    : console.log;
  fn(LOG_PREFIX, `[${level.toUpperCase()}]`, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
