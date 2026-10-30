import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,

  // Fail fast instead of making requests wait while Redis is unreachable.
  // Without these, a cached route like GET /menu hangs and then errors.
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,

  // Keep trying to reconnect in the background, at most every 5 seconds.
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

// A down Redis fires an error on every retry. Log it at most once every
// 10 seconds so it doesn't flood the terminal.
let lastLogged = 0;

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => {
  const now = Date.now();
  if (now - lastLogged > 10_000) {
    console.error('Redis error:', err.message);
    lastLogged = now;
  }
});

export default redis;