import { Router } from 'express';
import { BoardController } from '../controllers/board.controller';

const router = Router();

router.get('/teams', BoardController.getTeams);
router.get('/matches', BoardController.getMatches);
router.get('/registrations', BoardController.getRegistrations);

export default router;