import { ValidationError } from './errorHandler.js';
import { VALID_STATUSES, VALID_PRIORITIES, VALID_MESSAGE_TYPES } from '../services/businessRules.js';

/**
 * Validates payload for creating a new ticket
 */
export function validateCreateTicket(req, res, next) {
  const { subject, customer, description, priority, status } = req.body;
  const details = [];

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    details.push({ field: 'subject', message: 'Subject is required.' });
  }

  if (!customer || typeof customer !== 'string' || !customer.trim()) {
    details.push({ field: 'customer', message: 'Customer identifier (name or email) is required.' });
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    details.push({ field: 'description', message: 'Description is required.' });
  }

  if (priority !== undefined && priority !== null && !VALID_PRIORITIES.includes(priority)) {
    details.push({
      field: 'priority',
      message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`
    });
  }

  if (status !== undefined && status !== null && !VALID_STATUSES.includes(status)) {
    details.push({
      field: 'status',
      message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`
    });
  }

  if (details.length > 0) {
    return next(new ValidationError(details, 'Invalid ticket payload'));
  }

  next();
}

/**
 * Validates payload for updating an existing ticket
 */
export function validateUpdateTicket(req, res, next) {
  const { subject, customer, description, priority, status } = req.body;
  const details = [];

  if (subject !== undefined) {
    if (typeof subject !== 'string' || !subject.trim()) {
      details.push({ field: 'subject', message: 'Subject cannot be empty.' });
    }
  }

  if (customer !== undefined) {
    if (typeof customer !== 'string' || !customer.trim()) {
      details.push({ field: 'customer', message: 'Customer identifier cannot be empty.' });
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || !description.trim()) {
      details.push({ field: 'description', message: 'Description cannot be empty.' });
    }
  }

  if (priority !== undefined && priority !== null) {
    if (!VALID_PRIORITIES.includes(priority)) {
      details.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`
      });
    }
  }

  if (status !== undefined && status !== null) {
    if (!VALID_STATUSES.includes(status)) {
      details.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }
  }

  if (details.length > 0) {
    return next(new ValidationError(details, 'Invalid ticket update payload'));
  }

  next();
}

/**
 * Validates payload for adding a reply or note
 */
export function validateCreateMessage(req, res, next) {
  const { type, content } = req.body;
  const details = [];

  if (!type || !VALID_MESSAGE_TYPES.includes(type)) {
    details.push({
      field: 'type',
      message: `Message type is required and must be either 'reply' or 'note'.`
    });
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    details.push({
      field: 'content',
      message: 'Message content is required.'
    });
  }

  if (details.length > 0) {
    return next(new ValidationError(details, 'Invalid message payload'));
  }

  next();
}
