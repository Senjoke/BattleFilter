"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardService = void 0;
const db_1 = __importDefault(require("../config/db"));
const redis_1 = __importDefault(require("../config/redis"));
const normalizeMode = (mode) => {
    if (mode === '6v6')
        return '6v6';
    if (mode === 'auction')
        return 'auction';
    return '5v5';
};
const getModeFromGroupId = (groupId) => {
    if (groupId?.startsWith('group-auction-'))
        return 'auction';
    return groupId?.startsWith('group-6v6-') ? '6v6' : '5v5';
};
class BoardService {
    static async getTeams(tenantId, modeInput = '5v5') {
        const mode = normalizeMode(modeInput);
        const cacheKey = `board:teams:${tenantId}:${mode}`;
        try {
            const cached = await redis_1.default.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) {
            console.warn('Redis error:', e);
        }
        const result = await db_1.default.query('SELECT id, name, members, group_id FROM teams WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
        const data = result.rows.filter(t => getModeFromGroupId(t.group_id) === mode);
        try {
            await redis_1.default.set(cacheKey, JSON.stringify(data), 'EX', 3600); // cache for 1 hour
        }
        catch (e) { }
        return data;
    }
    static async getMatches(tenantId, modeInput = '5v5') {
        const mode = normalizeMode(modeInput);
        const cacheKey = `board:matches:${tenantId}:${mode}`;
        try {
            const cached = await redis_1.default.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        const result = await db_1.default.query(`
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
            await redis_1.default.set(cacheKey, JSON.stringify(data), 'EX', 3600);
        }
        catch (e) { }
        return data;
    }
    static async getRegistrations(tenantId) {
        const cacheKey = `board:registrations:${tenantId}`;
        try {
            const cached = await redis_1.default.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        const result = await db_1.default.query('SELECT battle_tag as "battleTag" FROM registrations WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
        try {
            await redis_1.default.set(cacheKey, JSON.stringify(result.rows), 'EX', 3600);
        }
        catch (e) { }
        return result.rows;
    }
}
exports.BoardService = BoardService;
//# sourceMappingURL=board.service.js.map