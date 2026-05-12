"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementsService = void 0;
const db_1 = __importDefault(require("../config/db"));
const period_1 = require("../utils/period");
const redis_1 = __importDefault(require("../config/redis"));
class AnnouncementsService {
    static async getAnnouncement(tenantId) {
        const periodId = (0, period_1.getPeriodId)();
        const cacheKey = `announcements:${tenantId}:${periodId}`;
        try {
            const cached = await redis_1.default.get(cacheKey);
            if (cached)
                return JSON.parse(cached);
        }
        catch (e) { }
        const result = await db_1.default.query('SELECT * FROM announcements WHERE period_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1', [periodId, tenantId]);
        const data = result.rows.length > 0 ? result.rows[0] : null;
        try {
            await redis_1.default.set(cacheKey, JSON.stringify(data), 'EX', 3600);
        }
        catch (e) { }
        return data;
    }
    static async saveAnnouncement(tenantId, title, content, startTime) {
        const periodId = (0, period_1.getPeriodId)();
        const checkResult = await db_1.default.query('SELECT id FROM announcements WHERE period_id = $1 AND tenant_id = $2', [periodId, tenantId]);
        if (checkResult.rows.length > 0) {
            await db_1.default.query('UPDATE announcements SET title = $1, content = $2, start_time = $3, updated_at = NOW() WHERE period_id = $4 AND tenant_id = $5', [title, content, startTime, periodId, tenantId]);
        }
        else {
            await db_1.default.query('INSERT INTO announcements (title, content, start_time, period_id, tenant_id) VALUES ($1, $2, $3, $4, $5)', [title, content, startTime, periodId, tenantId]);
        }
        try {
            await redis_1.default.del(`announcements:${tenantId}:${periodId}`);
        }
        catch (e) { }
    }
}
exports.AnnouncementsService = AnnouncementsService;
//# sourceMappingURL=announcements.service.js.map