import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
        }
    }
}
export declare const tenantMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=tenant.d.ts.map