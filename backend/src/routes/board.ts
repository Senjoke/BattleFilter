import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { ApiResponse } from '../../../shared/types';
import { getPeriodId } from './registration';

const router = Router();

// C端: GET /api/board/teams
router.get('/teams', async (req: Request, res: Response) => {
  const periodId = getPeriodId();

  try {
    const result = await pool.query(
      'SELECT id, name, members, group_id FROM teams WHERE period_id = $1 ORDER BY created_at ASC',
      [periodId]
    );

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '获取队伍列表成功',
      data: result.rows
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Fetch board teams error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// C端: GET /api/board/matches
router.get('/matches', async (req: Request, res: Response) => {
  const periodId = getPeriodId();

  try {
    const result = await pool.query(`
      SELECT 
        m.id, 
        m.status, 
        m.score1 as "scoreA", 
        m.score2 as "scoreB",
        m.match_order as "matchOrder",
        ta.name as "teamAName",
        tb.name as "teamBName"
      FROM matches m
      JOIN teams ta ON m.team1_id = ta.id
      JOIN teams tb ON m.team2_id = tb.id
      WHERE m.period_id = $1 
      ORDER BY m.match_order ASC, m.created_at ASC
    `, [periodId]);

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '获取赛程列表成功',
      data: result.rows
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Fetch board matches error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// C端: GET /api/board/registrations
router.get('/registrations', async (req: Request, res: Response) => {
  const periodId = getPeriodId();

  try {
    const result = await pool.query(
      'SELECT battle_tag as "battleTag" FROM registrations WHERE period_id = $1 ORDER BY created_at ASC',
      [periodId]
    );

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '获取已报名选手成功',
      data: result.rows
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Fetch board registrations error:', error);
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