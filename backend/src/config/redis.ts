import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Reconnect after 2 seconds
    return Math.min(times * 50, 2000);
  },
});

redis.on('error', (err) => {
  console.warn('Redis connection error (cache & metrics will be degraded):', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis successfully');
});

export default redis;