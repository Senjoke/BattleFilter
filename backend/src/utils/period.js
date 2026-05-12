"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeriodId = void 0;
const getPeriodId = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const week = Math.ceil(diff / oneWeek);
    return `${now.getFullYear()}-W${week}`;
};
exports.getPeriodId = getPeriodId;
//# sourceMappingURL=period.js.map