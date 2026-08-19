import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import registrationRouter from './routes/registration';
import teamsRouter from './routes/teams';
import matchesRouter from './routes/matches';
import boardRouter from './routes/board';
import auctionRouter from './routes/auction';
import announcementsRouter from './routes/announcements';
import metricsRouter from './routes/metrics';
import footerRouter from './routes/footer';

import { tenantMiddleware } from './middlewares/tenant';
import { metricsMiddleware } from './middlewares/metrics';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(tenantMiddleware);
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'BattleFilter API is running' });
});

// 路由挂载
// Auth
app.use('/api/admin', authRouter); // POST /api/admin/login

// Registrations
app.use('/api', registrationRouter); // POST /api/registrations, GET /api/admin/registrations

// Teams
app.use('/api/admin/teams', teamsRouter); // POST /api/admin/teams/generate

// Matches
app.use('/api/admin/matches', matchesRouter); // POST /api/admin/matches/generate

// Board
app.use('/api/board', boardRouter); // GET /api/board/teams, GET /api/board/matches

// Auction
app.use('/api', auctionRouter);

// Announcements
app.use('/api/announcements', announcementsRouter);

// Footer
app.use('/api/footer', footerRouter);

// Metrics
app.use('/api/admin/metrics', metricsRouter);

export default app;
