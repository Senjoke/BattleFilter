import { Request, Response } from 'express';
export declare class AnnouncementsController {
    static getAnnouncement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveAnnouncement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static clearAnnouncement(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=announcements.controller.d.ts.map