import ticketService from '../services/ticketService.js';
import { MethodNotAllowedError } from '../middleware/errorHandler.js';

export const ticketController = {
  /**
   * GET /api/tickets
   */
  async getTickets(req, res, next) {
    try {
      const result = await ticketService.getAllTickets(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/tickets/:id
   */
  async getTicketById(req, res, next) {
    try {
      const ticket = await ticketService.getTicketById(req.params.id);
      res.json({ data: ticket });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/tickets
   */
  async createTicket(req, res, next) {
    try {
      const newTicket = await ticketService.createTicket(req.body);
      res.status(201).json({ data: newTicket });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/tickets/:id
   */
  async updateTicket(req, res, next) {
    try {
      const updatedTicket = await ticketService.updateTicket(req.params.id, req.body);
      res.json({ data: updatedTicket });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/tickets/:id/messages
   */
  async addMessage(req, res, next) {
    try {
      const message = await ticketService.addMessage(req.params.id, req.body);
      res.status(201).json({ data: message });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/agents
   */
  async getAgents(req, res, next) {
    try {
      const agents = await ticketService.getAgents();
      res.json({ data: agents });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/dashboard
   */
  async getDashboardStats(req, res, next) {
    try {
      const stats = await ticketService.getDashboardStats();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE policy handler - 405 Method Not Allowed
   */
  disallowDelete(req, res, next) {
    next(new MethodNotAllowedError('Ticket deletion is prohibited by system audit policy.'));
  }
};

export default ticketController;
