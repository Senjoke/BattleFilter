import { Router, Request, Response } from 'express';
import pool from '../config/db';
import redis from '../config/redis';
import { authMiddleware } from '../middlewares/auth';
import { ApiResponse } from '../../../shared/types';

const router = Router();

// 获取报名通道状态 (公开)
router.get('/registrations/status', async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  let isOpen = true;
  try {
    const status = await redis.get(`registration:status:${tenantId}`);
    if (status === 'false') {
      isOpen = false;
    }
  } catch (error) {
    console.error('Redis get registration status error:', error);
  }
  res.json({ success: true, code: 200, message: '获取状态成功', data: { isOpen } });
});

// 管理员设置报名通道状态
router.post('/admin/registrations/status', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  if (typeof req.body.isOpen === 'boolean') {
    try {
      await redis.set(`registration:status:${tenantId}`, req.body.isOpen ? 'true' : 'false');
      res.json({ success: true, code: 200, message: '报名通道状态更新成功', data: { isOpen: req.body.isOpen } });
    } catch (error) {
      console.error('Redis set registration status error:', error);
      res.status(500).json({ success: false, code: 500, message: '状态保存失败', data: null });
    }
  } else {
    res.status(400).json({ success: false, code: 400, message: '无效的参数', data: null });
  }
});

// C端: POST /api/registrations
router.post('/registrations', async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  
  let isOpen = true;
  try {
    const status = await redis.get(`registration:status:${tenantId}`);
    if (status === 'false') {
      isOpen = false;
    }
  } catch (error) {
    console.error('Redis get registration status error:', error);
  }
  
  if (!isOpen) {
    const response: ApiResponse = {
      success: false,
      code: 403,
      message: '当前报名通道已关闭，暂不接受报名',
      data: null
    };
    return res.status(403).json(response);
  }

  const { battleTag, wechatId, wechatGroup, primaryRoles, secondaryRoles, selfRanks } = req.body;

  if (!battleTag || !wechatId || !wechatGroup || !primaryRoles || primaryRoles.length === 0) {
    const response: ApiResponse = {
      success: false,
      code: 400,
      message: '参数错误，缺少战网标识、微信昵称、群组或首选职责',
      data: null
    };
    return res.status(400).json(response);
  }

  const periodId = 'global';
  
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
  const nicknameRegex = /^[\p{L}\p{M}][\p{L}\p{M}\p{N}]{1,11}$/u;
  const suffixRegex = /^\d{4,6}$/;
  
  if (!nicknameRegex.test(nickname) || !suffixRegex.test(suffix)) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: '战网昵称不符合规范：名字部分为2-12个字符(支持各国语言，不以数字开头)；后缀为4-6位数字',
      data: null
    });
  }

  try {
    const checkResult = await pool.query(
      'SELECT id FROM registrations WHERE (battle_tag = $1 OR wechat_id = $2) AND tenant_id = $3',
      [battleTag, wechatId, req.tenantId]
    );

    if (checkResult.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        code: 409,
        message: '战网ID或微信号已报名，请勿重复提交',
        data: null
      };
      return res.status(409).json(response);
    }

    await pool.query(
      'INSERT INTO registrations (battle_tag, wechat_id, wechat_group, primary_roles, secondary_roles, self_ranks, period_id, tenant_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
      [battleTag, wechatId, wechatGroup, JSON.stringify(primaryRoles), JSON.stringify(secondaryRoles || []), JSON.stringify(selfRanks || {}), periodId, req.tenantId]
    );

    redis.del(`board:registrations:${req.tenantId}`).catch(() => {});

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '报名成功',
      data: null
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// B端: GET /api/admin/registrations
router.get('/admin/registrations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, battle_tag as "battleTag", wechat_id as "wechatId", wechat_group as "wechatGroup", primary_roles as "primaryRoles", secondary_roles as "secondaryRoles", self_ranks as "selfRanks", queried_ranks as "queriedRanks", period_id as "periodId", created_at as "createdAt" FROM registrations WHERE tenant_id = $1 ORDER BY created_at DESC',
      [req.tenantId]
    );

    const response: ApiResponse = {
      success: true,
      code: 200,
      message: '获取报名列表成功',
      data: result.rows
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Fetch registrations error:', error);
    const response: ApiResponse = {
      success: false,
      code: 500,
      message: '服务器内部错误',
      data: null
    };
    return res.status(500).json(response);
  }
});

// B端: DELETE /api/admin/registrations/clear
router.delete('/admin/registrations/clear', authMiddleware, async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM registrations WHERE tenant_id = $1', [req.tenantId]);
    redis.del(`board:registrations:${req.tenantId}`).catch(() => {});
    return res.status(200).json({ success: true, code: 200, message: '清空报名信息成功', data: null });
  } catch (error) {
    console.error('Clear registrations error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// B端: PUT /api/admin/registrations/:id/group
router.put('/admin/registrations/:id/group', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { wechatGroup } = req.body;
  
  if (!wechatGroup) {
    return res.status(400).json({ success: false, code: 400, message: '缺少群组信息', data: null });
  }

  try {
    await pool.query('UPDATE registrations SET wechat_group = $1 WHERE id = $2 AND tenant_id = $3', [wechatGroup, id, req.tenantId]);
    redis.del(`board:registrations:${req.tenantId}`).catch(() => {});
    return res.status(200).json({ success: true, code: 200, message: '修改群组成功', data: null });
  } catch (error) {
    console.error('Update registration group error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// B端: DELETE /api/admin/registrations/:id
router.delete('/admin/registrations/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM registrations WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
    redis.del(`board:registrations:${req.tenantId}`).catch(() => {});
    return res.status(200).json({ success: true, code: 200, message: '删除报名信息成功', data: null });
  } catch (error) {
    console.error('Delete registration error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
