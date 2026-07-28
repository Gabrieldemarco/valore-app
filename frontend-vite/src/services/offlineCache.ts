const CACHE_NAME = 'velsoie-offline-v1';

export async function cacheForOffline(url: string, data: unknown): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(url, response);
  } catch { /* silent */ }
}

export async function getCached<T>(url: string): Promise<T | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    if (response) return await response.json();
  } catch { /* silent */ }
  return null;
}

export async function clearCache(): Promise<void> {
  try {
    await caches.delete(CACHE_NAME);
  } catch { /* silent */ }
}
