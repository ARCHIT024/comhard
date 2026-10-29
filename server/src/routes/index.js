import { Router } from 'express';
import ticketRoutes from './ticketRoutes.js';
import ticketController from '../controllers/ticketController.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Agents endpoint
router.get('/agents', ticketController.getAgents);

// Dashboard stats endpoint
router.get('/dashboard', ticketController.getDashboardStats);

// Tickets resource routes
router.use('/tickets', ticketRoutes);

export default router;
