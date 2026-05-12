"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementsController = void 0;
const announcements_service_1 = require("../services/announcements.service");
class AnnouncementsController {
    static async getAnnouncement(req, res) {
        try {
            const data = await announcements_service_1.AnnouncementsService.getAnnouncement(req.tenantId || 'default');
            const response = {
                success: true, code: 200, message: '获取公告成功', data
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Fetch announcement error:', error);
            res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
    static async saveAnnouncement(req, res) {
        const { title, content, startTime } = req.body;
        try {
            await announcements_service_1.AnnouncementsService.saveAnnouncement(req.tenantId || 'default', title, content, startTime);
            const response = {
                success: true, code: 200, message: '公告保存成功', data: null
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Save announcement error:', error);
            res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
}
exports.AnnouncementsController = AnnouncementsController;
//# sourceMappingURL=announcements.controller.js.map