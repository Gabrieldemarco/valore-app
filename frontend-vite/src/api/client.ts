const API_BASE = '';
const CACHE_TTL = 30_000;

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function getToken(): string | null {
  return localStorage.getItem('staffToken') || localStorage.getItem('superAdminToken');
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  const headers: Record<string, string> = { ...extraHeaders };
  const token = getToken();
  if (token) headers['Authorization'] = token;
  if (body) headers['Content-Type'] = 'application/json';

  const cacheKey = `${method}:${path}`;
  if (method === 'GET') {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('superAdminToken');
    window.location.href = '/staff/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');

  if (method === 'GET') setCache(cacheKey, data);

  return data;
}

export function clearApiCache(): void {
  cache.clear();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
