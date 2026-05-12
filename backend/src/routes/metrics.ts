import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import redis from '../config/redis';

const router = Router();

router.use(tenantMiddleware);

// 获取系统指标数据
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  const today = new Date().toISOString().split('T')[0];

  try {
    const globalVisits = await redis.get('stats:total_visits:global') || '0';
    const tenantVisits = await redis.get(`stats:total_visits:${tenantId}`) || '0';
    
    // HyperLogLog 获取估算的唯一访问人数
    const globalDau = await redis.pfcount(`stats:dau:global:${today}`);
    const tenantDau = await redis.pfcount(`stats:dau:${tenantId}:${today}`);

    return res.status(200).json({
      success: true,
      code: 200,
      message: '获取系统指标成功',
      data: {
        globalVisits: parseInt(globalVisits, 10),
        tenantVisits: parseInt(tenantVisits, 10),
        globalDau,
        tenantDau
      }
    });
  } catch (error) {
    console.error('Fetch metrics error:', error);
    return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;