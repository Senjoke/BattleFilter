import pool from '../config/db';
import redis from '../config/redis';

type TeamMode = '5v5' | '6v6';

const normalizeMode = (mode: any): TeamMode => mode === '6v6' ? '6v6' : '5v5';

const getModeFromGroupId = (groupId: string | undefined): TeamMode => {
  return groupId?.startsWith('group-6v6-') ? '6v6' : '5v5';
};

export class BoardService {
  static async getTeams(tenantId: string, modeInput: any = '5v5') {
    const mode = normalizeMode(modeInput);
    const cacheKey = `board:teams:${tenantId}:${mode}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Redis error:', e);
    }

    const result = await pool.query(
      'SELECT id, name, members, group_id FROM teams WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );
    const data = result.rows.filter(t => getModeFromGroupId(t.group_id) === mode);

    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600); // cache for 1 hour
    } catch (e) {}

    return data;
  }

  static async getMatches(tenantId: string, modeInput: any = '5v5') {
    const mode = normalizeMode(modeInput);
    const cacheKey = `board:matches:${tenantId}:${mode}`;
    
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
        tb.name as "teamBName",
        ta.group_id as "teamAGroupId",
        tb.group_id as "teamBGroupId"
      FROM matches m
      JOIN teams ta ON m.team1_id = ta.id
      JOIN teams tb ON m.team2_id = tb.id
      WHERE m.tenant_id = $1
      ORDER BY m.match_order ASC, m.created_at ASC
    `, [tenantId]);
    const data = result.rows.filter(m => {
      return getModeFromGroupId(m.teamAGroupId) === mode && getModeFromGroupId(m.teamBGroupId) === mode;
    });

    try {
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);
    } catch (e) {}

    return data;
  }

  static async getRegistrations(tenantId: string) {
    const cacheKey = `board:registrations:${tenantId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    const result = await pool.query(
      'SELECT battle_tag as "battleTag" FROM registrations WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );

    try {
      await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 3600);
    } catch (e) {}

    return result.rows;
  }
}
