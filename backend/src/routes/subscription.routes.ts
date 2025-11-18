import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/subscription/current
 * Get current subscription for authenticated user
 *
 * Headers:
 * Authorization: Bearer <access_token>
 */
router.get('/current', authMiddleware, (req, res) => subscriptionController.getCurrent(req, res));

/**
 * POST /api/subscription/create-checkout
 * Create Stripe checkout session
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Body:
 * {
 *   "priceId": "price_xxx",
 *   "successUrl": "https://...",
 *   "cancelUrl": "https://...",
 *   "billingCycle": "monthly" | "yearly"
 * }
 */
router.post('/create-checkout', authMiddleware, (req, res) => subscriptionController.createCheckout(req, res));

/**
 * POST /api/subscription/portal
 * Create Stripe customer portal session
 *
 * Headers:
 * Authorization: Bearer <access_token>
 *
 * Body:
 * {
 *   "returnUrl": "https://..."
 * }
 */
router.post('/portal', authMiddleware, (req, res) => subscriptionController.createPortal(req, res));

export default router;
