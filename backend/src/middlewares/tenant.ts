import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenant_id || 'default';
  req.tenantId = tenantId as string;
  next();
};