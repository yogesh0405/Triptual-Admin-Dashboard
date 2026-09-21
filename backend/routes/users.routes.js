import { Router } from 'express';
import { listUsers, updateUserPassword, updateUserStatus } from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.get('/', listUsers);
router.patch('/:id/status', updateUserStatus);
router.patch('/:id/password', updateUserPassword);
export default router;
