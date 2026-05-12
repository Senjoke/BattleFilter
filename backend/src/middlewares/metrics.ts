import { Request, Response, NextFunction } from 'express';
import pool from '../config/db';
import redis from '../config/redis';

export const metricsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.tenantId || 'default';
  const path = req.path;
  
  // 只记录 C 端重要页面的访问，或者全局记录（这里全局记录）
  if (!path.startsWith('/api/admin')) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. 异步写入 DB
    pool.query(
      'INSERT INTO access_logs (tenant_id, path, ip, user_agent) VALUES ($1, $2, $3, $4)',
      [tenantId, path, ip, userAgent]
    ).catch(e => console.error('Failed to log access to DB:', e));

    // 2. 写入 Redis 统计指标
    try {
      // 全局总访问量
      await redis.incr('stats:total_visits:global');
      // 租户访问量
      await redis.incr(`stats:total_visits:${tenantId}`);
      
      // 活跃人数 (使用 HyperLogLog 按天统计 IP)
      const today = new Date().toISOString().split('T')[0];
      await redis.pfadd(`stats:dau:global:${today}`, ip as string);
      await redis.pfadd(`stats:dau:${tenantId}:${today}`, ip as string);
    } catch (e) {
      console.error('Failed to log metrics to Redis:', e);
    }
  }

  next();
};