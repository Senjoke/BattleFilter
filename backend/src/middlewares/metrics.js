"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = void 0;
const db_1 = __importDefault(require("../config/db"));
const redis_1 = __importDefault(require("../config/redis"));
const metricsMiddleware = async (req, res, next) => {
    const tenantId = req.tenantId || 'default';
    const path = req.path;
    // 只记录 C 端重要页面的访问，或者全局记录（这里全局记录）
    if (!path.startsWith('/api/admin')) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        // 1. 异步写入 DB
        db_1.default.query('INSERT INTO access_logs (tenant_id, path, ip, user_agent) VALUES ($1, $2, $3, $4)', [tenantId, path, ip, userAgent]).catch(e => console.error('Failed to log access to DB:', e));
        // 2. 写入 Redis 统计指标
        try {
            // 全局总访问量
            await redis_1.default.incr('stats:total_visits:global');
            // 租户访问量
            await redis_1.default.incr(`stats:total_visits:${tenantId}`);
            // 活跃人数 (使用 HyperLogLog 按天统计 IP)
            const today = new Date().toISOString().split('T')[0];
            await redis_1.default.pfadd(`stats:dau:global:${today}`, ip);
            await redis_1.default.pfadd(`stats:dau:${tenantId}:${today}`, ip);
        }
        catch (e) {
            console.error('Failed to log metrics to Redis:', e);
        }
    }
    next();
};
exports.metricsMiddleware = metricsMiddleware;
//# sourceMappingURL=metrics.js.map