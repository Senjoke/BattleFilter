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
      const decoded = jwt.verify(token, secret) as any;
      
      // 多租户隔离验证：检查 token 里的 tenantId 是否与当前请求的 tenantId 匹配
      const requestTenantId = req.tenantId || 'default';
      if (decoded.tenantId && decoded.tenantId !== requestTenantId) {
        const response: ApiResponse = {
          success: false,
          code: 403,
          message: '无权访问该社区的管理后台',
          data: null
        };
        return res.status(403).json(response);
      }

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
