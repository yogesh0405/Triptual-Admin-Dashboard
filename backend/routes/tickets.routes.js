import { Router } from 'express';
import multer from 'multer';
import {
  listTickets,
  getTicketDetails,
  updateTicketStatus,
  sendTicketMessage,
} from '../controllers/tickets.controller.js';
import { authenticate } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

const router = Router();
router.use(authenticate);

router.get('/', listTickets);
router.get('/:ticketNumber', getTicketDetails);
router.patch('/:ticketNumber/status', updateTicketStatus);
router.post('/:ticketNumber/messages', upload.single('attachment'), sendTicketMessage);

export default router;
