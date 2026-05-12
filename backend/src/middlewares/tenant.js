"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const tenantMiddleware = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenant_id || 'default';
    req.tenantId = tenantId;
    next();
};
exports.tenantMiddleware = tenantMiddleware;
//# sourceMappingURL=tenant.js.map