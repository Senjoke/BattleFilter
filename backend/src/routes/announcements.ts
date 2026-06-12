import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { AnnouncementsController } from '../controllers/announcements.controller';

const router = Router();

// 获取当前周期的公告 (C端、B端通用)
router.get('/', AnnouncementsController.getAnnouncement);

// 保存公告 (B端)
router.post('/', authMiddleware, AnnouncementsController.saveAnnouncement);

// 清除公告 (B端)
router.delete('/', authMiddleware, AnnouncementsController.clearAnnouncement);

export default router;