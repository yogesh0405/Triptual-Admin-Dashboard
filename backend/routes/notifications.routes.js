import { Router } from 'express';
import { getAudienceCount, getBroadcastHistory, sendBroadcast } from '../controllers/notifications.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/audience-count', getAudienceCount);
router.post('/broadcast', sendBroadcast);
router.get('/broadcasts', getBroadcastHistory);

export default router;
