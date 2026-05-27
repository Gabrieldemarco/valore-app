import { describe, it, expect, beforeEach, vi } from 'vitest';

const fakeFetch = vi.fn();
globalThis.fetch = fakeFetch;

beforeEach(() => {
  fakeFetch.mockReset();
  localStorage.clear();
});

const API_BASE = '';

async function request<T>(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  const headers: Record<string, string> = { ...extraHeaders };
  const token = localStorage.getItem('staffToken') || localStorage.getItem('superAdminToken');
  if (token) headers['Authorization'] = token;
  if (body) headers['Content-Type'] = 'application/json';

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
  return data;
}

describe('api client', () => {
  it('GET request succeeds', async () => {
    fakeFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'ok' }),
    });
    const result = await request('/test');
    expect(result).toEqual({ data: 'ok' });
    expect(fakeFetch).toHaveBeenCalledWith('/test', expect.objectContaining({ method: 'GET' }));
  });

  it('POST sends JSON body', async () => {
    fakeFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 1 }),
    });
    const result = await request('/test', { method: 'POST', body: { name: 'test' } });
    expect(result).toEqual({ id: 1 });
    const call = fakeFetch.mock.calls[0];
    const opts = call[1];
    expect(opts.method).toBe('POST');
    expect(opts.headers).toHaveProperty('Content-Type', 'application/json');
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('includes Authorization header when token exists', async () => {
    localStorage.setItem('staffToken', 'mytoken123');
    fakeFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await request('/test');
    const opts = fakeFetch.mock.calls[0][1];
    expect(opts.headers).toHaveProperty('Authorization', 'mytoken123');
  });

  it('throws on non-ok response', async () => {
    fakeFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });
    await expect(request('/test')).rejects.toThrow('Bad request');
  });

  it('redirects on 401 and clears token', async () => {
    localStorage.setItem('staffToken', 'expired');
    fakeFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });
    await expect(request('/test')).rejects.toThrow('Unauthorized');
    expect(localStorage.getItem('staffToken')).toBeNull();
  });
});
