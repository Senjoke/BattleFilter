import pool from '../config/db';
import { getPeriodId } from '../utils/period';
import redis from '../config/redis';

export class AnnouncementsService {
  static async getAnnouncement(tenantId: string) {
    const periodId = getPeriodId();
    const cacheKey = `announcements:${tenantId}:${periodId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    const result = await pool.query(
      'SELECT * FROM announcements WHERE period_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1',
      [periodId, tenantId]
    );

    const data = result.rows.length > 0 ? result.rows[0] : null;

    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);
    } catch (e) {}

    return data;
  }

  static async saveAnnouncement(tenantId: string, title: string, content: string, startTime: string) {
    const periodId = getPeriodId();

    const checkResult = await pool.query('SELECT id FROM announcements WHERE period_id = $1 AND tenant_id = $2', [periodId, tenantId]);
    
    if (checkResult.rows.length > 0) {
      await pool.query(
        'UPDATE announcements SET title = $1, content = $2, start_time = $3, updated_at = NOW() WHERE period_id = $4 AND tenant_id = $5',
        [title, content, startTime, periodId, tenantId]
      );
    } else {
      await pool.query(
        'INSERT INTO announcements (title, content, start_time, period_id, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [title, content, startTime, periodId, tenantId]
      );
    }

    try {
      await redis.del(`announcements:${tenantId}:${periodId}`);
    } catch (e) {}
  }
}