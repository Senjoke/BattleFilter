"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const registration_1 = __importDefault(require("./routes/registration"));
const teams_1 = __importDefault(require("./routes/teams"));
const matches_1 = __importDefault(require("./routes/matches"));
const board_1 = __importDefault(require("./routes/board"));
const announcements_1 = __importDefault(require("./routes/announcements"));
const metrics_1 = __importDefault(require("./routes/metrics"));
const tenant_1 = require("./middlewares/tenant");
const metrics_2 = require("./middlewares/metrics");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(tenant_1.tenantMiddleware);
app.use(metrics_2.metricsMiddleware);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'BattleFilter API is running' });
});
// 路由挂载
// Auth
app.use('/api/admin', auth_1.default); // POST /api/admin/login
// Registrations
app.use('/api', registration_1.default); // POST /api/registrations, GET /api/admin/registrations
// Teams
app.use('/api/admin/teams', teams_1.default); // POST /api/admin/teams/generate
// Matches
app.use('/api/admin/matches', matches_1.default); // POST /api/admin/matches/generate
// Board
app.use('/api/board', board_1.default); // GET /api/board/teams, GET /api/board/matches
// Announcements
app.use('/api/announcements', announcements_1.default);
// Metrics
app.use('/api/admin/metrics', metrics_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map