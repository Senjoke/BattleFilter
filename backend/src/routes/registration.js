"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeriodId = void 0;
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
let isRegistrationOpen = true;
// 获取报名通道状态 (公开)
router.get('/registrations/status', (req, res) => {
    res.json({ success: true, code: 200, message: '获取状态成功', data: { isOpen: isRegistrationOpen } });
});
// 管理员设置报名通道状态
router.post('/admin/registrations/status', auth_1.authMiddleware, (req, res) => {
    if (typeof req.body.isOpen === 'boolean') {
        isRegistrationOpen = req.body.isOpen;
        res.json({ success: true, code: 200, message: '报名通道状态更新成功', data: { isOpen: isRegistrationOpen } });
    }
    else {
        res.status(400).json({ success: false, code: 400, message: '无效的参数', data: null });
    }
});
const getPeriodId = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.ceil(diff / oneWeek);
    return `${now.getFullYear()}-W${week}`;
};
exports.getPeriodId = getPeriodId;
// C端: POST /api/registrations
router.post('/registrations', async (req, res) => {
    if (!isRegistrationOpen) {
        const response = {
            success: false,
            code: 403,
            message: '当前报名通道已关闭，暂不接受报名',
            data: null
        };
        return res.status(403).json(response);
    }
    const { battleTag, wechatId, wechatGroup, primaryRoles, secondaryRoles, selfRanks } = req.body;
    if (!battleTag || !wechatId || !wechatGroup || !primaryRoles || primaryRoles.length === 0) {
        const response = {
            success: false,
            code: 400,
            message: '参数错误，缺少战网标识、微信昵称、群组或首选职责',
            data: null
        };
        return res.status(400).json(response);
    }
    const periodId = (0, exports.getPeriodId)();
    // 验证战网昵称格式 (例如：网易#1234)
    const tagParts = battleTag.split('#');
    if (tagParts.length !== 2) {
        return res.status(400).json({
            success: false,
            code: 400,
            message: '战网标识格式错误，必须包含#和数字后缀',
            data: null
        });
    }
    const nickname = tagParts[0];
    const suffix = tagParts[1];
    const nicknameRegex = /^([\u4e00-\u9fa5][\u4e00-\u9fa50-9]{1,7}|[a-zA-Z][a-zA-Z0-9]{2,11})$/;
    const suffixRegex = /^\d{4,6}$/;
    if (!nicknameRegex.test(nickname) || !suffixRegex.test(suffix)) {
        return res.status(400).json({
            success: false,
            code: 400,
            message: '战网昵称不符合规范：第一部分为2-8个中文字或3-12个英文字母(可含数字不以数字开头)；后缀为4-6位数字',
            data: null
        });
    }
    try {
        const checkResult = await db_1.default.query('SELECT id FROM registrations WHERE (battle_tag = $1 OR wechat_id = $2) AND period_id = $3', [battleTag, wechatId, periodId]);
        if (checkResult.rows.length > 0) {
            const response = {
                success: false,
                code: 409,
                message: '当前周期战网ID或微信号已报名，请勿重复提交',
                data: null
            };
            return res.status(409).json(response);
        }
        await db_1.default.query('INSERT INTO registrations (battle_tag, wechat_id, wechat_group, primary_roles, secondary_roles, self_ranks, period_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())', [battleTag, wechatId, wechatGroup, JSON.stringify(primaryRoles), JSON.stringify(secondaryRoles || []), JSON.stringify(selfRanks || {}), periodId]);
        const response = {
            success: true,
            code: 200,
            message: '报名成功',
            data: null
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Registration error:', error);
        const response = {
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null
        };
        return res.status(500).json(response);
    }
});
// B端: GET /api/admin/registrations
router.get('/admin/registrations', auth_1.authMiddleware, async (req, res) => {
    const periodId = (0, exports.getPeriodId)();
    try {
        const result = await db_1.default.query('SELECT id, battle_tag as "battleTag", wechat_id as "wechatId", wechat_group as "wechatGroup", primary_roles as "primaryRoles", secondary_roles as "secondaryRoles", self_ranks as "selfRanks", queried_ranks as "queriedRanks", period_id as "periodId", created_at as "createdAt" FROM registrations WHERE period_id = $1 ORDER BY created_at DESC', [periodId]);
        const response = {
            success: true,
            code: 200,
            message: '获取报名列表成功',
            data: result.rows
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Fetch registrations error:', error);
        const response = {
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null
        };
        return res.status(500).json(response);
    }
});
// B端: DELETE /api/admin/registrations/:id
router.delete('/admin/registrations/:id', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    if (id === 'clear') {
        // 转发给 clear 逻辑
        return;
    }
    try {
        await db_1.default.query('DELETE FROM registrations WHERE id = $1', [id]);
        return res.status(200).json({ success: true, code: 200, message: '删除报名信息成功', data: null });
    }
    catch (error) {
        console.error('Delete registration error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// B端: DELETE /api/admin/registrations/clear
router.delete('/admin/registrations/clear', auth_1.authMiddleware, async (req, res) => {
    const periodId = (0, exports.getPeriodId)();
    try {
        // 级联清空队伍中的未分配队员，不过由于队伍和报名表是弱关联（靠 gameId 关联），
        // 并且系统是整体性的，一般清空报名列表代表重新开始。
        await db_1.default.query('DELETE FROM registrations WHERE period_id = $1', [periodId]);
        return res.status(200).json({ success: true, code: 200, message: '清空报名信息成功', data: null });
    }
    catch (error) {
        console.error('Clear registrations error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
exports.default = router;
//# sourceMappingURL=registration.js.map