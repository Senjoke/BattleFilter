"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementsController = void 0;
const announcements_service_1 = require("../services/announcements.service");
class AnnouncementsController {
    static async getAnnouncement(req, res) {
        const tenantId = req.tenantId || 'default';
        try {
            const announcement = await announcements_service_1.AnnouncementsService.getAnnouncement(tenantId);
            if (announcement) {
                return res.status(200).json({
                    success: true,
                    code: 200,
                    message: '获取公告成功',
                    data: announcement
                });
            }
            else {
                return res.status(200).json({
                    success: true,
                    code: 200,
                    message: '暂无公告',
                    data: null
                });
            }
        }
        catch (error) {
            console.error('Fetch announcements error:', error);
            return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
    static async saveAnnouncement(req, res) {
        const { title, content, startTime } = req.body;
        const tenantId = req.tenantId || 'default';
        if (!title || !content) {
            return res.status(400).json({ success: false, code: 400, message: '标题和内容不能为空', data: null });
        }
        try {
            const saved = await announcements_service_1.AnnouncementsService.saveAnnouncement(tenantId, title, content, startTime);
            return res.status(200).json({
                success: true,
                code: 200,
                message: '公告保存成功',
                data: saved
            });
        }
        catch (error) {
            console.error('Save announcement error:', error);
            return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
    static async clearAnnouncement(req, res) {
        const tenantId = req.tenantId || 'default';
        try {
            await announcements_service_1.AnnouncementsService.clearAnnouncement(tenantId);
            return res.status(200).json({
                success: true,
                code: 200,
                message: '公告清除成功',
                data: null
            });
        }
        catch (error) {
            console.error('Clear announcement error:', error);
            return res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
}
exports.AnnouncementsController = AnnouncementsController;
//# sourceMappingURL=announcements.controller.js.map