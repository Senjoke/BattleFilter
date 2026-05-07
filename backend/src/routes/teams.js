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
// 3. 自动填充一组队伍（基于 1重装 2输出 2支援 的职责要求）
router.post('/group/:groupId/autofill', auth_1.authMiddleware, async (req, res) => {
    const { groupId } = req.params;
    const periodId = (0, registration_1.getPeriodId)();
    try {
        const teamsRes = await db_1.default.query('SELECT * FROM teams WHERE group_id = $1 ORDER BY id ASC', [groupId]);
        if (teamsRes.rows.length !== 2) {
            return res.status(400).json({ success: false, code: 400, message: '无效的队伍组', data: null });
        }
        const teams = teamsRes.rows;
        const regRes = await db_1.default.query('SELECT id, battle_tag, primary_roles, secondary_roles FROM registrations WHERE period_id = $1', [periodId]);
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
        const unassigned = regRes.rows
            .filter(r => !assignedGameIds.has(r.battle_tag))
            .map(r => {
            let primaryRoles = r.primary_roles;
            let secondaryRoles = r.secondary_roles;
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
            primaryRoles = primaryRoles || [];
            secondaryRoles = secondaryRoles || [];
            // 为兼容简单的自动填充，将首选和补位合并去重处理
            const roles = Array.from(new Set([...primaryRoles, ...secondaryRoles]));
            return {
                id: r.id,
                nickname: r.battle_tag.split('#')[0],
                gameId: r.battle_tag,
                roles: roles,
                score: 0
            };
        });
        const REQUIRED_ROLES = { tank: 1, damage: 2, support: 2 };
        for (const team of teams) {
            let members = team.members;
            if (typeof members === 'string') {
                try {
                    members = JSON.parse(members);
                }
                catch (e) {
                    members = [];
                }
            }
            members = members || [];
            const currentCounts = { tank: 0, damage: 0, support: 0 };
            members.forEach((m) => {
                if (m.assignedRole && currentCounts[m.assignedRole] !== undefined) {
                    currentCounts[m.assignedRole]++;
                }
            });
            for (const [role, maxCount] of Object.entries(REQUIRED_ROLES)) {
                while (currentCounts[role] < maxCount) {
                    const playerIdx = unassigned.findIndex(p => p.roles.includes(role));
                    if (playerIdx > -1) {
                        const p = unassigned.splice(playerIdx, 1)[0];
                        if (p) {
                            members.push({
                                id: p.id,
                                nickname: p.nickname,
                                gameId: p.gameId,
                                roles: p.roles,
                                assignedRole: role,
                                score: p.score
                            });
                            currentCounts[role]++;
                        }
                    }
                    else {
                        break;
                    }
                }
            }
            await db_1.default.query('UPDATE teams SET members = $1 WHERE id = $2', [JSON.stringify(members), team.id]);
        }
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