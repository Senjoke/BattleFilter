"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const tenantId = req.tenantId || 'default';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordsStr = process.env.ADMIN_PASSWORDS || '{}';
    const secret = process.env.JWT_SECRET;
    let adminPasswords = {};
    try {
        adminPasswords = JSON.parse(adminPasswordsStr);
    }
    catch (e) {
        console.error('Failed to parse ADMIN_PASSWORDS from .env', e);
        const response = {
            success: false,
            code: 500,
            message: '管理员密码配置格式错误，必须为合法的 JSON 字符串',
            data: null
        };
        return res.status(500).json(response);
    }
    // 获取当前社区对应的密码，如果没有单独设置则使用 default 密码
    const tenantPassword = adminPasswords[tenantId] || adminPasswords['default'];
    if (!tenantPassword) {
        const response = {
            success: false,
            code: 500,
            message: '管理员密码未配置，请在后端环境变量中设置 ADMIN_PASSWORDS',
            data: null
        };
        return res.status(500).json(response);
    }
    if (!secret) {
        const response = {
            success: false,
            code: 500,
            message: '服务端 JWT_SECRET 未配置',
            data: null
        };
        return res.status(500).json(response);
    }
    if (username === adminUsername && password === tenantPassword) {
        // 将 tenantId 也签入 Token，增强安全性
        const token = jsonwebtoken_1.default.sign({ username, role: 'admin', tenantId }, secret, { expiresIn: '24h' });
        const response = {
            success: true,
            code: 200,
            message: '登录成功',
            data: { token }
        };
        return res.status(200).json(response);
    }
    const response = {
        success: false,
        code: 401,
        message: '用户名或密码错误',
        data: null
    };
    return res.status(401).json(response);
});
exports.default = router;
//# sourceMappingURL=auth.js.map