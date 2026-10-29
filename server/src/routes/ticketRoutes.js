import { Router } from 'express';
import ticketController from '../controllers/ticketController.js';
import {
  validateCreateTicket,
  validateUpdateTicket,
  validateCreateMessage
} from '../middleware/validation.js';

const router = Router();

// Ticket CRUD and actions
router.get('/', ticketController.getTickets);
router.post('/', validateCreateTicket, ticketController.createTicket);
router.delete('/', ticketController.disallowDelete);

router.get('/:id', ticketController.getTicketById);
router.patch('/:id', validateUpdateTicket, ticketController.updateTicket);
router.delete('/:id', ticketController.disallowDelete);

// Message / Note creation
router.post('/:id/messages', validateCreateMessage, ticketController.addMessage);

export default router;
