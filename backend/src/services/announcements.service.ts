import pool from '../config/db';
import redis from '../config/redis';

export class AnnouncementsService {
  static async getAnnouncement(tenantId: string) {
    const cacheKey = `announcements:${tenantId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    const result = await pool.query(
      'SELECT * FROM announcements WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
      [tenantId]
    );

    const data = result.rows.length > 0 ? result.rows[0] : null;

    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);
    } catch (e) {}

    return data;
  }

  static async saveAnnouncement(tenantId: string, title: string, content: string, startTime: string) {
    const periodId = 'global';

    const checkResult = await pool.query('SELECT id FROM announcements WHERE tenant_id = $1', [tenantId]);
    
    if (checkResult.rows.length > 0) {
      await pool.query(
        'UPDATE announcements SET title = $1, content = $2, start_time = $3, updated_at = NOW() WHERE tenant_id = $4',
        [title, content, startTime, tenantId]
      );
    } else {
      await pool.query(
        'INSERT INTO announcements (title, content, start_time, period_id, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [title, content, startTime, periodId, tenantId]
      );
    }

    try {
      await redis.del(`announcements:${tenantId}`);
    } catch (e) {}
  }
}
