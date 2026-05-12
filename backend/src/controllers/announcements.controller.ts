import { Request, Response } from 'express';
import { AnnouncementsService } from '../services/announcements.service';
import { ApiResponse } from '../../../shared/types';

export class AnnouncementsController {
  static async getAnnouncement(req: Request, res: Response) {
    try {
      const data = await AnnouncementsService.getAnnouncement(req.tenantId || 'default');
      const response: ApiResponse = {
        success: true, code: 200, message: '获取公告成功', data
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch announcement error:', error);
      res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async saveAnnouncement(req: Request, res: Response) {
    const { title, content, startTime } = req.body;
    try {
      await AnnouncementsService.saveAnnouncement(req.tenantId || 'default', title, content, startTime);
      const response: ApiResponse = {
        success: true, code: 200, message: '公告保存成功', data: null
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Save announcement error:', error);
      res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }
}