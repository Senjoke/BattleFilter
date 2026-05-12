"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const tenant_1 = require("../middlewares/tenant");
const redis_1 = __importDefault(require("../config/redis"));
const router = (0, express_1.Router)();
router.use(tenant_1.tenantMiddleware);
// 获取系统指标数据
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const tenantId = req.tenantId || 'default';
    const today = new Date().toISOString().split('T')[0];
    try {
        const globalVisits = await redis_1.default.get('stats:total_visits:global') || '0';
        const tenantVisits = await redis_1.default.get(`stats:total_visits:${tenantId}`) || '0';
        // HyperLogLog 获取估算的唯一访问人数
        const globalDau = await redis_1.default.pfcount(`stats:dau:global:${today}`);
        const tenantDau = await redis_1.default.pfcount(`stats:dau:${tenantId}:${today}`);
        return res.status(200).json({
            success: true,
            code: 200,
            message: '获取系统指标成功',
            data: {
                globalVisits: parseInt(globalVisits, 10),
                tenantVisits: parseInt(tenantVisits, 10),
                globalDau,
                tenantDau
            }
        });
    }
    catch (error) {
        console.error('Fetch metrics error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map