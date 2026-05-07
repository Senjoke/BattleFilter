"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = {
            success: false,
            code: 401,
            message: '用户未授权',
            data: null
        };
        return res.status(401).json(response);
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        const response = {
            success: false,
            code: 401,
            message: '无效的 token 格式',
            data: null
        };
        return res.status(401).json(response);
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        const response = {
            success: false,
            code: 500,
            message: '服务端 JWT_SECRET 未配置',
            data: null
        };
        return res.status(500).json(response);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        const response = {
            success: false,
            code: 401,
            message: '令牌无效或已过期',
            data: null
        };
        return res.status(401).json(response);
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map