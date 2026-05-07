import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middlewares/auth';
import { ApiResponse } from '../../../shared/types';
import { getPeriodId } from './registration';

const router = Router();

// 获取当前周期的公告 (C端、B端通用)
router.get('/', async (req: Request, res: Response) => {
  const periodId = getPeriodId();

  try {
    const result = await pool.query(
      'SELECT * FROM announcements WHERE period_id = $1 ORDER BY created_at DESC LIMIT 1',
      [periodId]
    );

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '获取公告成功',
      data: result.rows.length > 0 ? result.rows[0] : null
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Fetch announcement error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// 保存公告 (B端)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { title, content, startTime } = req.body;
  const periodId = getPeriodId();

  try {
    // 检查是否已有公告
    const checkResult = await pool.query('SELECT id FROM announcements WHERE period_id = $1', [periodId]);
    
    if (checkResult.rows.length > 0) {
      // 更新
      await pool.query(
        'UPDATE announcements SET title = $1, content = $2, start_time = $3, updated_at = NOW() WHERE period_id = $4',
        [title, content, startTime, periodId]
      );
    } else {
      // 插入
      await pool.query(
        'INSERT INTO announcements (title, content, start_time, period_id) VALUES ($1, $2, $3, $4)',
        [title, content, startTime, periodId]
      );
    }

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '公告保存成功',
      data: null
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Save announcement error:', error);
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