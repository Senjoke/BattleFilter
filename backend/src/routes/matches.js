"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middlewares/auth");
const redis_1 = __importDefault(require("../config/redis"));
const router = (0, express_1.Router)();
const normalizeMode = (mode) => mode === '6v6' ? '6v6' : '5v5';
const getModeFromGroupId = (groupId) => {
    return groupId?.startsWith('group-6v6-') ? '6v6' : '5v5';
};
const clearMatchesCache = (tenantId, mode) => {
    const keyTenant = tenantId || 'default';
    const modes = mode ? [mode] : ['5v5', '6v6'];
    redis_1.default.del(`board:matches:${keyTenant}`).catch(() => { });
    modes.forEach(m => {
        redis_1.default.del(`board:matches:${keyTenant}:${m}`).catch(() => { });
    });
};
const getTeamIdsByMode = async (tenantId, mode) => {
    const teamsResult = await db_1.default.query('SELECT id, name, group_id FROM teams WHERE group_id IS NOT NULL AND tenant_id = $1', [tenantId]);
    const teams = teamsResult.rows.filter(t => getModeFromGroupId(t.group_id) === mode);
    const teamIds = teams.map(t => t.id);
    return { teams, teamIds };
};
const deleteMatchesByTeamIds = async (tenantId, teamIds) => {
    if (teamIds.length === 0)
        return;
    await db_1.default.query('DELETE FROM matches WHERE tenant_id = $1 AND (team1_id = ANY($2::int[]) OR team2_id = ANY($2::int[]))', [tenantId, teamIds]);
};
// 生成赛程
router.post('/generate', auth_1.authMiddleware, async (req, res) => {
    const mode = normalizeMode(req.body?.mode || req.query?.mode);
    const periodId = 'global';
    try {
        // 1. 获取当前模式的所有分组队伍
        const { teams, teamIds } = await getTeamIdsByMode(req.tenantId, mode);
        if (teams.length < 2) {
            const response = {
                success: false,
                code: 400,
                message: '队伍数量不足，无法生成赛程',
                data: null
            };
            return res.status(400).json(response);
        }
        // 按 group_id 分组
        const groupsMap = new Map();
        teams.forEach(t => {
            if (!groupsMap.has(t.group_id))
                groupsMap.set(t.group_id, []);
            groupsMap.get(t.group_id)?.push(t);
        });
        await deleteMatchesByTeamIds(req.tenantId, teamIds);
        const matches = [];
        // 在每个对战组内部两两生成对局
        for (const [groupId, groupTeams] of groupsMap.entries()) {
            for (let i = 0; i < groupTeams.length; i++) {
                for (let j = i + 1; j < groupTeams.length; j++) {
                    const teamA = groupTeams[i];
                    const teamB = groupTeams[j];
                    await db_1.default.query('INSERT INTO matches (period_id, tenant_id, team1_id, team2_id, status, match_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [periodId, req.tenantId, teamA.id, teamB.id, 'pending', matches.length + 1]);
                    matches.push({ teamA, teamB });
                }
            }
        }
        clearMatchesCache(req.tenantId, mode);
        const response = {
            success: true,
            code: 200,
            message: '赛程生成成功',
            data: { matchesCount: matches.length }
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Generate matches error:', error);
        const response = {
            success: false,
            code: 500,
            message: '服务器内部错误',
            data: null
        };
        return res.status(500).json(response);
    }
});
// 清空赛程
router.delete('/clear', auth_1.authMiddleware, async (req, res) => {
    const mode = normalizeMode(req.query?.mode || req.body?.mode);
    try {
        const { teamIds } = await getTeamIdsByMode(req.tenantId, mode);
        await deleteMatchesByTeamIds(req.tenantId, teamIds);
        clearMatchesCache(req.tenantId, mode);
        return res.status(200).json({ success: true, code: 200, message: '赛程清空成功', data: null });
    }
    catch (error) {
        console.error('Clear matches error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// 更新赛程顺序和状态
router.post('/update', auth_1.authMiddleware, async (req, res) => {
    const { matches } = req.body; // Array of { id, status, matchOrder }
    const mode = normalizeMode(req.body?.mode || req.query?.mode);
    if (!matches || !Array.isArray(matches)) {
        return res.status(400).json({ success: false, code: 400, message: '无效的参数', data: null });
    }
    try {
        // 开启事务
        await db_1.default.query('BEGIN');
        for (const match of matches) {
            if (match.id !== undefined) {
                await db_1.default.query('UPDATE matches SET status = $1, match_order = $2 WHERE id = $3 AND tenant_id = $4', [match.status, match.matchOrder, match.id, req.tenantId]);
            }
        }
        await db_1.default.query('COMMIT');
        clearMatchesCache(req.tenantId, mode);
        return res.status(200).json({ success: true, code: 200, message: '赛程更新成功', data: null });
    }
    catch (error) {
        await db_1.default.query('ROLLBACK');
        console.error('Update matches error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// 录入比分
router.post('/score', auth_1.authMiddleware, async (req, res) => {
    const { matchId, scoreA, scoreB } = req.body;
    const mode = normalizeMode(req.body?.mode || req.query?.mode);
    if (matchId === undefined || scoreA === undefined || scoreB === undefined) {
        const response = {
            success: false,
            code: 400,
            message: '缺少比分参数',
            data: null
        };
        return res.status(400).json(response);
    }
    try {
        await db_1.default.query('UPDATE matches SET score1 = $1, score2 = $2, status = $3 WHERE id = $4 AND tenant_id = $5', [scoreA, scoreB, 'completed', matchId, req.tenantId]);
        clearMatchesCache(req.tenantId, mode);
        const response = {
            success: true,
            code: 200,
            message: '比分录入成功',
            data: null
        };
        return res.status(200).json(response);
    }
    catch (error) {
        console.error('Save score error:', error);
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
//# sourceMappingURL=matches.js.map
