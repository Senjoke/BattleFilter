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
// 段位转换分数工具函数
const rankToScore = (rankStr) => {
    if (!rankStr || rankStr === '未定级')
        return 1500; // 默认白银
    const tiers = {
        '青铜': 1000,
        '白银': 1500,
        '黄金': 2000,
        '白金': 2500,
        '钻石': 3000,
        '大师': 3500,
        '宗师': 4000,
        '英杰': 4500
    };
    const match = rankStr.match(/^(青铜|白银|黄金|白金|钻石|大师|宗师|英杰)(\d)?$/);
    if (!match)
        return 1500;
    const tier = match[1];
    const sub = match[2] ? parseInt(match[2], 10) : 3; // 默认给个中间分段3
    const baseScore = tiers[tier] || 1500;
    // 5是最低，1是最高，所以 (5 - sub) * 100
    return baseScore + (5 - sub) * 100;
};
// 获取玩家在某个特定职责的分数
const getPlayerScore = (player, role) => {
    if (player.selfRanks && player.selfRanks[role] && player.selfRanks[role] !== '未定级') {
        return rankToScore(player.selfRanks[role]);
    }
    // 如果没有该职责分，计算已定级位置的平均分
    const scores = Object.values(player.selfRanks || {})
        .filter((s) => s && s !== '未定级')
        .map((s) => rankToScore(s));
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 1500;
};
// 1. 创建一组空队伍（两个队）
router.post('/group', auth_1.authMiddleware, async (req, res) => {
    const periodId = (0, registration_1.getPeriodId)();
    const groupId = `group-${Date.now()}`;
    const version = `v1.0-${Date.now()}`;
    try {
        const t1 = await db_1.default.query('INSERT INTO teams (period_id, group_id, name, version, members, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, group_id, members', [periodId, groupId, '队伍 A', version, '[]']);
        const t2 = await db_1.default.query('INSERT INTO teams (period_id, group_id, name, version, members, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, group_id, members', [periodId, groupId, '队伍 B', version, '[]']);
        return res.status(200).json({ success: true, code: 200, message: '队伍组创建成功', data: { groupId, teams: [t1.rows[0], t2.rows[0]] } });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// 2. 删除一组队伍
router.delete('/group/:groupId', auth_1.authMiddleware, async (req, res) => {
    const { groupId } = req.params;
    try {
        // 级联删除相关的赛程
        await db_1.default.query(`
      DELETE FROM matches 
      WHERE team1_id IN (SELECT id FROM teams WHERE group_id = $1)
         OR team2_id IN (SELECT id FROM teams WHERE group_id = $1)
    `, [groupId]);
        await db_1.default.query('DELETE FROM teams WHERE group_id = $1', [groupId]);
        return res.status(200).json({ success: true, code: 200, message: '队伍组删除成功', data: null });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// 3. 自动填充一组队伍（基于 1重装 2输出 2支援 的职责要求，并加入群号过滤和蛇形均衡分组）
router.post('/group/:groupId/autofill', auth_1.authMiddleware, async (req, res) => {
    const { groupId } = req.params;
    const { wechatGroup } = req.body;
    const periodId = (0, registration_1.getPeriodId)();
    try {
        const teamsRes = await db_1.default.query('SELECT * FROM teams WHERE group_id = $1 ORDER BY id ASC', [groupId]);
        if (teamsRes.rows.length !== 2) {
            return res.status(400).json({ success: false, code: 400, message: '无效的队伍组', data: null });
        }
        const teams = teamsRes.rows;
        const regRes = await db_1.default.query('SELECT id, battle_tag, primary_roles, secondary_roles, self_ranks, wechat_group FROM registrations WHERE period_id = $1', [periodId]);
        // 只从有效的分组队伍中统计已分配的玩家，保持与前端未分配池逻辑一致
        const allTeamsRes = await db_1.default.query('SELECT members FROM teams WHERE period_id = $1 AND group_id IS NOT NULL', [periodId]);
        const assignedGameIds = new Set();
        allTeamsRes.rows.forEach(t => {
            let members = t.members;
            if (typeof members === 'string') {
                try {
                    members = JSON.parse(members);
                }
                catch (e) {
                    members = [];
                }
            }
            members = members || [];
            members.forEach((m) => {
                if (m.gameId)
                    assignedGameIds.add(m.gameId);
            });
        });
        let unassigned = regRes.rows
            .filter(r => !assignedGameIds.has(r.battle_tag))
            .filter(r => !wechatGroup || r.wechat_group === wechatGroup) // 根据群号过滤
            .map(r => {
            let primaryRoles = r.primary_roles;
            let secondaryRoles = r.secondary_roles;
            let selfRanks = r.self_ranks;
            if (typeof primaryRoles === 'string') {
                try {
                    primaryRoles = JSON.parse(primaryRoles);
                }
                catch (e) {
                    primaryRoles = [];
                }
            }
            if (typeof secondaryRoles === 'string') {
                try {
                    secondaryRoles = JSON.parse(secondaryRoles);
                }
                catch (e) {
                    secondaryRoles = [];
                }
            }
            if (typeof selfRanks === 'string') {
                try {
                    selfRanks = JSON.parse(selfRanks);
                }
                catch (e) {
                    selfRanks = {};
                }
            }
            primaryRoles = primaryRoles || [];
            secondaryRoles = secondaryRoles || [];
            // 为兼容简单的自动填充，将首选和补位合并去重处理
            const roles = Array.from(new Set([...primaryRoles, ...secondaryRoles]));
            return {
                id: r.id,
                nickname: r.battle_tag.split('#')[0],
                gameId: r.battle_tag,
                roles: roles,
                selfRanks: selfRanks || {},
                score: 0 // 占位，实际在分配时根据职责计算
            };
        });
        const REQUIRED_ROLES = { tank: 1, damage: 2, support: 2 };
        const teamA = teams[0];
        const teamB = teams[1];
        const parseMembers = (membersStr) => {
            if (typeof membersStr === 'string') {
                try {
                    return JSON.parse(membersStr) || [];
                }
                catch (e) {
                    return [];
                }
            }
            return membersStr || [];
        };
        let membersA = parseMembers(teamA.members);
        let membersB = parseMembers(teamB.members);
        const getCountsAndScore = (members) => {
            const counts = { tank: 0, damage: 0, support: 0 };
            let totalScore = 0;
            members.forEach(m => {
                if (m.assignedRole && counts[m.assignedRole] !== undefined) {
                    counts[m.assignedRole]++;
                }
                totalScore += (m.score || 0);
            });
            return { counts, totalScore };
        };
        let { counts: countsA, totalScore: scoreA } = getCountsAndScore(membersA);
        let { counts: countsB, totalScore: scoreB } = getCountsAndScore(membersB);
        // 按特定职责顺序分配，避免某个稀缺职责被其他位置抢走
        const roleOrder = ['tank', 'support', 'damage'];
        for (const role of roleOrder) {
            let missingA = REQUIRED_ROLES[role] - countsA[role];
            let missingB = REQUIRED_ROLES[role] - countsB[role];
            let totalMissing = Math.max(0, missingA) + Math.max(0, missingB);
            if (totalMissing <= 0)
                continue;
            let candidates = unassigned.filter(p => p.roles.includes(role));
            candidates.sort((a, b) => getPlayerScore(b, role) - getPlayerScore(a, role));
            let selected = candidates.slice(0, totalMissing);
            const selectedIds = new Set(selected.map(p => p.id));
            unassigned = unassigned.filter(p => !selectedIds.has(p.id));
            for (const p of selected) {
                const pScore = getPlayerScore(p, role);
                const pMember = {
                    id: p.id,
                    nickname: p.nickname,
                    gameId: p.gameId,
                    roles: p.roles,
                    assignedRole: role,
                    score: pScore
                };
                if (missingA > 0 && missingB <= 0) {
                    membersA.push(pMember);
                    scoreA += pScore;
                    missingA--;
                }
                else if (missingB > 0 && missingA <= 0) {
                    membersB.push(pMember);
                    scoreB += pScore;
                    missingB--;
                }
                else if (missingA > 0 && missingB > 0) {
                    // 蛇形分配：分配给总分较低的队伍
                    if (scoreA <= scoreB) {
                        membersA.push(pMember);
                        scoreA += pScore;
                        missingA--;
                    }
                    else {
                        membersB.push(pMember);
                        scoreB += pScore;
                        missingB--;
                    }
                }
            }
        }
        await db_1.default.query('UPDATE teams SET members = $1 WHERE id = $2', [JSON.stringify(membersA), teamA.id]);
        await db_1.default.query('UPDATE teams SET members = $1 WHERE id = $2', [JSON.stringify(membersB), teamB.id]);
        return res.status(200).json({ success: true, code: 200, message: '自动填充完成', data: null });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
// 4. 编辑队伍持久化（支持更新成员和队伍名称）
router.post('/edit', auth_1.authMiddleware, async (req, res) => {
    const { teamId, members, name } = req.body;
    if (!teamId) {
        return res.status(400).json({ success: false, code: 400, message: '缺少必要参数teamId', data: null });
    }
    const membersData = members || [];
    try {
        if (name) {
            await db_1.default.query('UPDATE teams SET members = $1, name = $2 WHERE id = $3', [JSON.stringify(membersData), name, teamId]);
        }
        else {
            await db_1.default.query('UPDATE teams SET members = $1 WHERE id = $2', [JSON.stringify(membersData), teamId]);
        }
        return res.status(200).json({ success: true, code: 200, message: '队伍更新成功', data: null });
    }
    catch (error) {
        console.error('Edit team error:', error);
        return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
});
exports.default = router;
//# sourceMappingURL=teams.js.map