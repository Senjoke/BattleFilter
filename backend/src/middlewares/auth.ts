import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../../../shared/types';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse = {
      success: false,
      code: 401,
      message: '用户未授权',
      data: null
    };
    return res.status(401).json(response);
  }

  const token = authHeader.split(' ')[1];
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        code: 401,
        message: '无效的 token 格式',
        data: null
      };
      return res.status(401).json(response);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      const response: ApiResponse = {
        success: false,
        code: 500,
        message: '服务端 JWT_SECRET 未配置',
        data: null
      };
      return res.status(500).json(response);
    }
    
    try {
      const decoded = jwt.verify(token, secret);
      (req as any).user = decoded;
      next();
    } catch (error) {
    const response: ApiResponse = {
      success: false,
      code: 401,
      message: '令牌无效或已过期',
      data: null
    };
    return res.status(401).json(response);
  }
};
