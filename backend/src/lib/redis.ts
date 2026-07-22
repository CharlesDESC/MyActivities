import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on('error', (err) => {
  // Redis est optionnel — l'app continue sans cache si Redis est indisponible
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Redis] connection error:', err.message);
  }
});

const ACTIVITIES_TTL = 60; // secondes

function buildCacheKey(params: Record<string, unknown>): string {
  return 'activities:' + JSON.stringify(params, Object.keys(params).sort());
}

export async function getCachedActivities<T>(
  params: Record<string, unknown>,
): Promise<T | null> {
  try {
    const raw = await redis.get(buildCacheKey(params));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCachedActivities(
  params: Record<string, unknown>,
  data: unknown,
): Promise<void> {
  try {
    await redis.set(buildCacheKey(params), JSON.stringify(data), 'EX', ACTIVITIES_TTL);
  } catch {
    // silencieux — cache best-effort
  }
}

export async function invalidateActivitiesCache(): Promise<void> {
  try {
    const keys = await redis.keys('activities:*');
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // silencieux
  }
}
