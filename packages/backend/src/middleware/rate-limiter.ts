import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message: string;
}

const createRateLimiter = (config: RateLimitConfig, endpointName: string) => {
  return rateLimit({
    windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: config.max || 5, // 5 attempts default
    message: { error: config.message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
    handler: (req, res) => {
      const ip = req.ip || 'unknown';
      console.log(`🚫 RATE LIMITED - ${endpointName} - IP: ${ip} - ${new Date().toISOString()}`);
      res.status(429).json({ error: config.message });
    }
  });
};

// Pre-configured limiters for different endpoints
export const registrationLimiter = createRateLimiter({
  message: 'Too many registration attempts. Please try again later.'
}, 'register');

export const loginLimiter = createRateLimiter({
  message: 'Too many login attempts. Please try again later.'
}, 'login');

export const setMasterLimiter = createRateLimiter({
  message: 'Too many master password attempts. Please try again later.'
}, 'set-master');

export const addSecretLimiter = createRateLimiter({
  max: 50, // 50 attempts for add secret
  message: 'Too many secret creation attempts. Please try again later.'
}, 'add-secret');

export default createRateLimiter;