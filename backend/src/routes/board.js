"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const board_controller_1 = require("../controllers/board.controller");
const router = (0, express_1.Router)();
router.get('/teams', board_controller_1.BoardController.getTeams);
router.get('/matches', board_controller_1.BoardController.getMatches);
router.get('/registrations', board_controller_1.BoardController.getRegistrations);
exports.default = router;
//# sourceMappingURL=board.js.map