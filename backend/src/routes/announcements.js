"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middlewares/auth");
const registration_1 = require("./registration");
const router = (0, express_1.Router)();
// 获取当前周期的公告 (C端、B端通用)
router.get('/', async (req, res) => {
    const periodId = (0, registration_1.getPeriodId)();
    try {
        const result = await db_1.default.query('SELECT * FROM announcements WHERE period_id = $1 ORDER BY created_at DESC LIMIT 1', [periodId]);
        const response = {
            success: true,
            code: 200,
            message: '获取公告成功',
            data: result.rows.length > 0 ? result.rows[0] : null
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Fetch announcement error:', error);
        const response = {
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null
        };
        return res.status(500).json(response);
    }
});
// 保存公告 (B端)
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { title, content, startTime } = req.body;
    const periodId = (0, registration_1.getPeriodId)();
    try {
        // 检查是否已有公告
        const checkResult = await db_1.default.query('SELECT id FROM announcements WHERE period_id = $1', [periodId]);
        if (checkResult.rows.length > 0) {
            // 更新
            await db_1.default.query('UPDATE announcements SET title = $1, content = $2, start_time = $3, updated_at = NOW() WHERE period_id = $4', [title, content, startTime, periodId]);
        }
        else {
            // 插入
            await db_1.default.query('INSERT INTO announcements (title, content, start_time, period_id) VALUES ($1, $2, $3, $4)', [title, content, startTime, periodId]);
        }
        const response = {
            success: true,
            code: 200,
            message: '公告保存成功',
            data: null
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Save announcement error:', error);
        const response = {
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null
        };
        return res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=announcements.js.map