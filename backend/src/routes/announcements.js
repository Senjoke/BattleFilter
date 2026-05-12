"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const announcements_controller_1 = require("../controllers/announcements.controller");
const router = (0, express_1.Router)();
// 获取当前周期的公告 (C端、B端通用)
router.get('/', announcements_controller_1.AnnouncementsController.getAnnouncement);
// 保存公告 (B端)
router.post('/', auth_1.authMiddleware, announcements_controller_1.AnnouncementsController.saveAnnouncement);
exports.default = router;
//# sourceMappingURL=announcements.js.map