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
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const secret = process.env.JWT_SECRET;
    if (!adminUsername || !adminPassword) {
        const response = {
            success: false,
            code: 500,
            message: '管理员账号未配置，请在后端环境变量中设置 ADMIN_USERNAME 与 ADMIN_PASSWORD',
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
    if (username === adminUsername && password === adminPassword) {
        const token = jsonwebtoken_1.default.sign({ username, role: 'admin' }, secret, { expiresIn: '24h' });
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