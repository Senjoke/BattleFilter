"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardController = void 0;
const board_service_1 = require("../services/board.service");
class BoardController {
    static async getTeams(req, res) {
        try {
            const data = await board_service_1.BoardService.getTeams(req.tenantId || 'default');
            const response = {
                success: true, code: 200, message: '获取队伍列表成功', data
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Fetch board teams error:', error);
            res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
    static async getMatches(req, res) {
        try {
            const data = await board_service_1.BoardService.getMatches(req.tenantId || 'default');
            const response = {
                success: true, code: 200, message: '获取赛程列表成功', data
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Fetch board matches error:', error);
            res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
    static async getRegistrations(req, res) {
        try {
            const data = await board_service_1.BoardService.getRegistrations(req.tenantId || 'default');
            const response = {
                success: true, code: 200, message: '获取已报名选手成功', data
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Fetch board registrations error:', error);
            res.status(500).json({ success: false, code: 500, message: '服务器内部错误', data: null });
        }
    }
}
exports.BoardController = BoardController;
//# sourceMappingURL=board.controller.js.map