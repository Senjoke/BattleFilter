"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        // Reconnect after 2 seconds
        return Math.min(times * 50, 2000);
    },
});
redis.on('error', (err) => {
    console.warn('Redis connection error (cache & metrics will be degraded):', err.message);
});
redis.on('connect', () => {
    console.log('Connected to Redis successfully');
});
exports.default = redis;
//# sourceMappingURL=redis.js.map