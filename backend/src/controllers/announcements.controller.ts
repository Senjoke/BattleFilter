import { Request, Response } from 'express';
import { AnnouncementsService } from '../services/announcements.service';
import { ApiResponse } from '../../../shared/types';

export class AnnouncementsController {
  static async getAnnouncement(req: Request, res: Response) {
    const tenantId = req.tenantId || 'default';
    
    try {
      const announcement = await AnnouncementsService.getAnnouncement(tenantId);
      
      if (announcement) {
        return res.status(200).json({
          success: true,
          code: 200,
          message: '获取公告成功',
          data: announcement
        } as ApiResponse);
      } else {
        return res.status(200).json({
          success: true,
          code: 200,
          message: '暂无公告',
          data: null
        });
      }
    } catch (error) {
      console.error('Fetch announcements error:', error);
      return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async saveAnnouncement(req: Request, res: Response) {
    const { title, content, startTime } = req.body;
    const tenantId = req.tenantId || 'default';

    if (!title || !content) {
      return res.status(400).json({ success: false, code: 400, message: '标题和内容不能为空', data: null });
    }

    try {
      const saved = await AnnouncementsService.saveAnnouncement(tenantId, title, content, startTime);
      
      return res.status(200).json({
        success: true,
        code: 200,
        message: '公告保存成功',
        data: saved
      } as ApiResponse);
    } catch (error) {
      console.error('Save announcement error:', error);
      return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async clearAnnouncement(req: Request, res: Response) {
    const tenantId = req.tenantId || 'default';

    try {
      await AnnouncementsService.clearAnnouncement(tenantId);
      
      return res.status(200).json({
        success: true,
        code: 200,
        message: '公告清除成功',
        data: null
      } as ApiResponse);
    } catch (error) {
      console.error('Clear announcement error:', error);
      return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }
}