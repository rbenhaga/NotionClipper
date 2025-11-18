import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email/password or OAuth code
 *
 * Body (OAuth):
 * {
 *   "provider": "notion" | "google",
 *   "code": "oauth_code",
 *   "workspace_id": "user_workspace_id",
 *   "email": "user@example.com"
 * }
 *
 * Body (Email/Password):
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * Headers:
 * Authorization: Bearer <refresh_token>
 */
router.post('/refresh', (req, res) => authController.refresh(req, res));

/**
 * GET /api/auth/me
 * Get current user information
 *
 * Headers:
 * Authorization: Bearer <access_token>
 */
router.get('/me', authMiddleware, (req, res) => authController.me(req, res));

export default router;
