import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';

const router = Router();

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhooks
 *
 * NOTE: This endpoint requires raw body buffer, not JSON parsing
 * The main app should configure express.raw() for this route
 *
 * Headers:
 * stripe-signature: <signature>
 */
router.post('/webhook', (req, res) => subscriptionController.handleWebhook(req, res));

export default router;
