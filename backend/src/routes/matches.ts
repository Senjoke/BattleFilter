import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middlewares/auth';
import { ApiResponse } from '../../../shared/types';

import redis from '../config/redis';

const router = Router();

type TeamMode = '5v5' | '6v6' | 'auction';

const normalizeMode = (mode: any): TeamMode => {
  if (mode === '6v6') return '6v6';
  if (mode === 'auction') return 'auction';
  return '5v5';
};

const getModeFromGroupId = (groupId: string | undefined): TeamMode => {
  if (groupId?.startsWith('group-auction-')) return 'auction';
  return groupId?.startsWith('group-6v6-') ? '6v6' : '5v5';
};

const clearMatchesCache = (tenantId: string | undefined, mode?: TeamMode) => {
  const keyTenant = tenantId || 'default';
  const modes: TeamMode[] = mode ? [mode] : ['5v5', '6v6', 'auction'];
  redis.del(`board:matches:${keyTenant}`).catch(() => {});
  modes.forEach(m => {
    redis.del(`board:teams:${keyTenant}:${m}`).catch(() => {});
    redis.del(`board:matches:${keyTenant}:${m}`).catch(() => {});
  });
};

const getTeamIdsByMode = async (tenantId: string | undefined, mode: TeamMode) => {
  const teamsResult = await pool.query(
    'SELECT id, name, group_id FROM teams WHERE group_id IS NOT NULL AND tenant_id = $1',
    [tenantId]
  );
  const teams = teamsResult.rows.filter(t => getModeFromGroupId(t.group_id) === mode);
  const teamIds = teams.map(t => t.id);
  return { teams, teamIds };
};

const deleteMatchesByTeamIds = async (tenantId: string | undefined, teamIds: number[]) => {
  if (teamIds.length === 0) return;
  await pool.query(
    'DELETE FROM matches WHERE tenant_id = $1 AND (team1_id = ANY($2::int[]) OR team2_id = ANY($2::int[]))',
    [tenantId, teamIds]
  );
};

const parseJson = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const toArray = (value: any): string[] => {
  const parsed = parseJson<any[]>(value, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
};

const toRanks = (value: any): Record<string, string> => {
  const parsed = parseJson<Record<string, string>>(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
};

const buildPublishedMember = (row: any) => {
  const battleTag = String(row.battle_tag || '');
  const primaryRoles = toArray(row.primary_roles);
  const secondaryRoles = toArray(row.secondary_roles);
  const roles = Array.from(new Set([...primaryRoles, ...secondaryRoles]));
  const assignedRole = primaryRoles[0] || secondaryRoles[0] || 'flex';

  return {
    id: Number(row.registration_id || row.id),
    nickname: battleTag.split('#')[0] || battleTag || '未知玩家',
    gameId: battleTag,
    roles,
    selfRanks: toRanks(row.self_ranks),
    assignedRole,
    score: 0
  };
};

const clearPublishedAuctionSnapshot = async (tenantId: string | undefined) => {
  const { teamIds } = await getTeamIdsByMode(tenantId, 'auction');
  await deleteMatchesByTeamIds(tenantId, teamIds);
  await pool.query(
    `DELETE FROM teams
      WHERE tenant_id = $1
        AND group_id LIKE 'group-auction-%'`,
    [tenantId]
  );
};

const publishAuctionTeamsSnapshot = async (tenantId: string | undefined) => {
  const periodId = 'global';
  const version = `auction-${Date.now()}`;
  const groupId = `group-auction-${Date.now()}`;

  const sessionResult = await pool.query(
    'SELECT id FROM auction_sessions WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  const session = sessionResult.rows[0];
  if (!session) {
    throw new Error('请先抽取拍卖队长后再发布队伍信息');
  }

  const teamsResult = await pool.query(
    `SELECT at.id, at.name, at.captain_registration_id,
            r.id AS registration_id, r.battle_tag, r.primary_roles, r.secondary_roles, r.self_ranks
       FROM auction_teams at
       LEFT JOIN registrations r ON r.id = at.captain_registration_id
      WHERE at.tenant_id = $1 AND at.session_id = $2
      ORDER BY at.id ASC`,
    [tenantId, session.id]
  );

  if (teamsResult.rows.length < 2) {
    throw new Error('拍卖队伍数量不足，无法发布队伍信息');
  }

  const playersResult = await pool.query(
    `SELECT ap.team_id, ap.registration_id, r.battle_tag, r.primary_roles, r.secondary_roles, r.self_ranks
       FROM auction_players ap
       JOIN registrations r ON r.id = ap.registration_id
      WHERE ap.tenant_id = $1
        AND ap.session_id = $2
        AND ap.status IN ('sold', 'manual_assigned')
      ORDER BY ap.id ASC`,
    [tenantId, session.id]
  );

  await clearPublishedAuctionSnapshot(tenantId);

  const publishedTeams = [];
  for (const team of teamsResult.rows) {
    const members = [];
    if (team.captain_registration_id && team.registration_id) {
      members.push(buildPublishedMember(team));
    }
    playersResult.rows
      .filter(player => Number(player.team_id) === Number(team.id))
      .forEach(player => members.push(buildPublishedMember(player)));

    const result = await pool.query(
      `INSERT INTO teams (period_id, tenant_id, group_id, name, version, members, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, group_id`,
      [periodId, tenantId, groupId, team.name, version, JSON.stringify(members)]
    );
    publishedTeams.push(result.rows[0]);
  }

  return publishedTeams;
};

// 生成赛程
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const mode = normalizeMode(req.body?.mode || req.query?.mode);
  const periodId = 'global';

  try {
    if (mode === 'auction') {
      const teams = await publishAuctionTeamsSnapshot(req.tenantId);
      clearMatchesCache(req.tenantId, mode);
      return res.status(200).json({
        success: true,
        code: 200,
        message: '拍卖队伍信息发布成功',
        data: { teamsCount: teams.length }
      });
    }

    // 1. 获取当前模式的所有分组队伍
    const { teams } = await getTeamIdsByMode(req.tenantId, mode);
    const teamIds = teams.map(t => t.id);

    if (teams.length < 2) {
      const response: ApiResponse = {
        success: false,
        code: 400,
        message: '队伍数量不足，无法生成赛程',
        data: null
      };
      return res.status(400).json(response);
    }

    // 按 group_id 分组
    const groupsMap = new Map<string, any[]>();
    teams.forEach(t => {
      if (!groupsMap.has(t.group_id)) groupsMap.set(t.group_id, []);
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
          
          await pool.query(
            'INSERT INTO matches (period_id, tenant_id, team1_id, team2_id, status, match_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [periodId, req.tenantId, teamA.id, teamB.id, 'pending', matches.length + 1]
          );

          matches.push({ teamA, teamB });
        }
      }
    }

    clearMatchesCache(req.tenantId, mode);

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '赛程生成成功',
      data: { matchesCount: matches.length }
    };
    return res.status(200).json(response);

  } catch (error) {
    console.error('Generate matches error:', error);
    if (error instanceof Error && (error.message.includes('拍卖') || error.message.includes('队伍数量不足'))) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: error.message,
        data: null
      });
    }
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// 清空赛程
router.delete('/clear', authMiddleware, async (req: Request, res: Response) => {
  const mode = normalizeMode(req.query?.mode || req.body?.mode);
  try {
    if (mode === 'auction') {
      await clearPublishedAuctionSnapshot(req.tenantId);
      clearMatchesCache(req.tenantId, mode);
      return res.status(200).json({ success: true, code: 200, message: '拍卖队伍信息删除成功', data: null });
    }

    const { teamIds } = await getTeamIdsByMode(req.tenantId, mode);
    await deleteMatchesByTeamIds(req.tenantId, teamIds);
    clearMatchesCache(req.tenantId, mode);
    return res.status(200).json({ success: true, code: 200, message: '赛程清空成功', data: null });
  } catch (error) {
    console.error('Clear matches error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// 更新赛程顺序和状态
router.post('/update', authMiddleware, async (req: Request, res: Response) => {
  const { matches } = req.body; // Array of { id, status, matchOrder }
  const mode = normalizeMode(req.body?.mode || req.query?.mode);

  if (!matches || !Array.isArray(matches)) {
    return res.status(400).json({ success: false, code: 400, message: '无效的参数', data: null });
  }

  try {
    // 开启事务
    await pool.query('BEGIN');
    
    for (const match of matches) {
      if (match.id !== undefined) {
        await pool.query(
          'UPDATE matches SET status = $1, match_order = $2 WHERE id = $3 AND tenant_id = $4',
          [match.status, match.matchOrder, match.id, req.tenantId]
        );
      }
    }
    
    await pool.query('COMMIT');
    clearMatchesCache(req.tenantId, mode);
    return res.status(200).json({ success: true, code: 200, message: '赛程更新成功', data: null });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Update matches error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// 录入比分
router.post('/score', authMiddleware, async (req: Request, res: Response) => {
  const { matchId, scoreA, scoreB } = req.body;
  const mode = normalizeMode(req.body?.mode || req.query?.mode);

  if (matchId === undefined || scoreA === undefined || scoreB === undefined) {
    const response: ApiResponse = {
      success: false,
      code: 400,
      message: '缺少比分参数',
      data: null
    };
    return res.status(400).json(response);
  }

  try {
    await pool.query(
      'UPDATE matches SET score1 = $1, score2 = $2, status = $3 WHERE id = $4 AND tenant_id = $5',
      [scoreA, scoreB, 'completed', matchId, req.tenantId]
    );

    clearMatchesCache(req.tenantId, mode);

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '比分录入成功',
      data: null
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Save score error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

export default router;
