import { Router, Request, Response } from 'express';
import pool from '../config/db';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// GET /api/footer - 公共接口，获取页脚所需的所有数据
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.tenantId || 'default';
  
  try {
    const donatorsRes = await pool.query(
      'SELECT id, name, amount FROM donators WHERE tenant_id = $1 ORDER BY amount DESC, created_at ASC',
      [tenantId]
    );
    
    const operatorsRes = await pool.query(
      'SELECT id, name FROM operators WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );
    
    const contactsRes = await pool.query(
      'SELECT id, contact_type as "type", contact_value as "value" FROM admin_contacts WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 5',
      [tenantId]
    );

    res.json({
      success: true,
      code: 200,
      message: '获取页脚数据成功',
      data: {
        donators: donatorsRes.rows,
        operators: operatorsRes.rows,
        adminContacts: contactsRes.rows
      }
    });
  } catch (error) {
    console.error('Fetch footer data error:', error);
    res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
  }
});

// 管理员接口 - 打赏人员
router.post('/admin/donators', authMiddleware, async (req: Request, res: Response) => {
  const { name, amount } = req.body;
  if (!name || amount === undefined) {
    return res.status(400).json({ success: false, code: 400, message: '名称和打赏额度不能为空' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO donators (tenant_id, name, amount) VALUES ($1, $2, $3) RETURNING id, name, amount',
      [req.tenantId, name, amount]
    );
    res.json({ success: true, code: 200, message: '添加成功', data: result.rows[0] });
  } catch (error) {
    console.error('Add donator error:', error);
    res.status(500).json({ success: false, code: 500, message: '添加失败' });
  }
});

router.put('/admin/donators/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, amount } = req.body;
  if (!name || amount === undefined) {
    return res.status(400).json({ success: false, code: 400, message: '名称和打赏额度不能为空' });
  }
  
  try {
    await pool.query(
      'UPDATE donators SET name = $1, amount = $2 WHERE id = $3 AND tenant_id = $4',
      [name, amount, id, req.tenantId]
    );
    res.json({ success: true, code: 200, message: '更新成功' });
  } catch (error) {
    console.error('Update donator error:', error);
    res.status(500).json({ success: false, code: 500, message: '更新失败' });
  }
});

router.delete('/admin/donators/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM donators WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    console.error('Delete donator error:', error);
    res.status(500).json({ success: false, code: 500, message: '删除失败' });
  }
});

// 管理员接口 - 运营团队
router.post('/admin/operators', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, code: 400, message: '名称不能为空' });
  
  try {
    const result = await pool.query(
      'INSERT INTO operators (tenant_id, name) VALUES ($1, $2) RETURNING id, name',
      [req.tenantId, name]
    );
    res.json({ success: true, code: 200, message: '添加成功', data: result.rows[0] });
  } catch (error) {
    console.error('Add operator error:', error);
    res.status(500).json({ success: false, code: 500, message: '添加失败' });
  }
});

router.put('/admin/operators/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, code: 400, message: '名称不能为空' });
  
  try {
    await pool.query('UPDATE operators SET name = $1 WHERE id = $2 AND tenant_id = $3', [name, id, req.tenantId]);
    res.json({ success: true, code: 200, message: '更新成功' });
  } catch (error) {
    console.error('Update operator error:', error);
    res.status(500).json({ success: false, code: 500, message: '更新失败' });
  }
});

router.delete('/admin/operators/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM operators WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    console.error('Delete operator error:', error);
    res.status(500).json({ success: false, code: 500, message: '删除失败' });
  }
});

// 管理员接口 - 管理员打赏联系方式
router.post('/admin/contacts', authMiddleware, async (req: Request, res: Response) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ success: false, code: 400, message: '类型和联系方式不能为空' });
  
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM admin_contacts WHERE tenant_id = $1', [req.tenantId]);
    if (parseInt(countRes.rows[0].count) >= 5) {
      return res.status(400).json({ success: false, code: 400, message: '最多只能添加 5 个管理员打赏联系方式' });
    }
    
    const result = await pool.query(
      'INSERT INTO admin_contacts (tenant_id, contact_type, contact_value) VALUES ($1, $2, $3) RETURNING id, contact_type as "type", contact_value as "value"',
      [req.tenantId, type, value]
    );
    res.json({ success: true, code: 200, message: '添加成功', data: result.rows[0] });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ success: false, code: 500, message: '添加失败' });
  }
});

router.put('/admin/contacts/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ success: false, code: 400, message: '类型和联系方式不能为空' });
  
  try {
    await pool.query(
      'UPDATE admin_contacts SET contact_type = $1, contact_value = $2 WHERE id = $3 AND tenant_id = $4',
      [type, value, id, req.tenantId]
    );
    res.json({ success: true, code: 200, message: '更新成功' });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, code: 500, message: '更新失败' });
  }
});

router.delete('/admin/contacts/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM admin_contacts WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ success: false, code: 500, message: '删除失败' });
  }
});

export default router;