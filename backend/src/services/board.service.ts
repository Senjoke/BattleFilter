import pool from '../config/db';
import { getPeriodId } from '../utils/period';
import redis from '../config/redis';

export class BoardService {
  static async getTeams(tenantId: string) {
    const periodId = getPeriodId();
    const cacheKey = `board:teams:${tenantId}:${periodId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Redis error:', e);
    }

    const result = await pool.query(
      'SELECT id, name, members, group_id FROM teams WHERE period_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
      [periodId, tenantId]
    );

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 3600); // cache for 1 hour
    } catch (e) {}

    return result.rows;
  }

  static async getMatches(tenantId: string) {
    const periodId = getPeriodId();
    const cacheKey = `board:matches:${tenantId}:${periodId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    const result = await pool.query(`
      SELECT 
        m.id, 
        m.status, 
        m.score1 as "scoreA", 
        m.score2 as "scoreB",
        m.match_order as "matchOrder",
        ta.name as "teamAName",
        tb.name as "teamBName"
      FROM matches m
      JOIN teams ta ON m.team1_id = ta.id
      JOIN teams tb ON m.team2_id = tb.id
      WHERE m.period_id = $1 AND m.tenant_id = $2
      ORDER BY m.match_order ASC, m.created_at ASC
    `, [periodId, tenantId]);

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 3600);
    } catch (e) {}

    return result.rows;
  }

  static async getRegistrations(tenantId: string) {
    const periodId = getPeriodId();
    const cacheKey = `board:registrations:${tenantId}:${periodId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    const result = await pool.query(
      'SELECT battle_tag as "battleTag" FROM registrations WHERE period_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
      [periodId, tenantId]
    );

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 3600);
    } catch (e) {}

    return result.rows;
  }
}