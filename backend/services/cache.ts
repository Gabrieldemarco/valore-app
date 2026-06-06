import NodeCache from 'memory-cache';
import { cacheGet, cacheSet, cacheDel, isRedisEnabled } from './redis';

const TTL_DEFAULT = 60; // 60 segundos

export async function cacheMiddleware(ttlSeconds: number = TTL_DEFAULT) {
  return (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    const key = `__cache__${req.originalUrl}`;
    const memCached = NodeCache.get(key);
    if (memCached) return res.json(memCached);
    const _send = res.json.bind(res);
    res.json = async (body: any) => {
      NodeCache.put(key, body, ttlSeconds * 1000);
      if (isRedisEnabled()) {
        await cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return _send(body);
    };
    next();
  };
}

export function clearCache(pattern?: string) {
  if (!pattern) { NodeCache.clear(); return; }
  const keys = NodeCache.keys();
  keys.filter(k => k.includes(pattern)).forEach(k => NodeCache.del(k));
}

export async function clearCacheAsync(pattern?: string) {
  NodeCache.clear();
  if (isRedisEnabled()) {
    if (pattern) await cacheDel(pattern).catch(() => {});
    else await import('./redis').then(m => m.cacheFlush()).catch(() => {});
  }
}
