import { Router } from 'express';
import quotaController from '../controllers/quota.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All quota routes require authentication
router.use(authMiddleware);

router.get('/summary', quotaController.getSummary.bind(quotaController));
router.post('/check', quotaController.check.bind(quotaController));
router.post('/track', quotaController.track.bind(quotaController));

export default router;
