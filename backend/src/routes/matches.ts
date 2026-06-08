import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middlewares/auth';
import { ApiResponse } from '../../../shared/types';

import redis from '../config/redis';

const router = Router();

// 生成赛程
router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const periodId = 'global';

  try {
    // 1. 获取所有分组队伍
    const teamsResult = await pool.query(
      'SELECT id, name, group_id FROM teams WHERE group_id IS NOT NULL AND tenant_id = $1',
      [req.tenantId]
    );

    const teams = teamsResult.rows;

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

    await pool.query('DELETE FROM matches WHERE tenant_id = $1', [req.tenantId]);

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

    redis.del(`board:matches:${req.tenantId}`).catch(() => {});

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '赛程生成成功',
      data: { matchesCount: matches.length }
    };
    return res.status(200).json(response);

  } catch (error) {
    console.error('Generate matches error:', error);
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
  try {
    await pool.query('DELETE FROM matches WHERE tenant_id = $1', [req.tenantId]);
    redis.del(`board:matches:${req.tenantId}`).catch(() => {});
    return res.status(200).json({ success: true, code: 200, message: '赛程清空成功', data: null });
  } catch (error) {
    console.error('Clear matches error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// 更新赛程顺序和状态
router.post('/update', authMiddleware, async (req: Request, res: Response) => {
  const { matches } = req.body; // Array of { id, status, matchOrder }

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
    redis.del(`board:matches:${req.tenantId}`).catch(() => {});
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

    redis.del(`board:matches:${req.tenantId}`).catch(() => {});

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
