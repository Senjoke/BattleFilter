import { Request, Response } from 'express';
import { BoardService } from '../services/board.service';
import { ApiResponse } from '../../../shared/types';

export class BoardController {
  static async getTeams(req: Request, res: Response) {
    try {
      const data = await BoardService.getTeams(req.tenantId || 'default', req.query.mode);
      const response: ApiResponse = {
        success: true, code: 200, message: '获取队伍列表成功', data
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch board teams error:', error);
      res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getMatches(req: Request, res: Response) {
    try {
      const data = await BoardService.getMatches(req.tenantId || 'default', req.query.mode);
      const response: ApiResponse = {
        success: true, code: 200, message: '获取赛程列表成功', data
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch board matches error:', error);
      res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getRegistrations(req: Request, res: Response) {
    try {
      const data = await BoardService.getRegistrations(req.tenantId || 'default');
      const response: ApiResponse = {
        success: true, code: 200, message: '获取已报名选手成功', data
      };
      res.status(200).json(response);
    } catch (error) {
      console.error('Fetch board registrations error:', error);
      res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
    }
  }
}
