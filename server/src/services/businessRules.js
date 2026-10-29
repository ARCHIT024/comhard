/**
 * Shared Business Rules & Helpers for Support Desk System
 */

export const VALID_STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved'];
export const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const VALID_MESSAGE_TYPES = ['reply', 'note'];

export const OVERDUE_HOURS = 24;

/**
 * Returns the ISO UTC string timestamp for the overdue cutoff (24 hours before `now`).
 * A ticket is overdue if status != 'Resolved' AND created_at < cutoffIso.
 * @param {Date} [now=new Date()]
 * @returns {string} ISO UTC timestamp string
 */
export function getOverdueCutoffIso(now = new Date()) {
  const cutoffTime = now.getTime() - OVERDUE_HOURS * 60 * 60 * 1000;
  return new Date(cutoffTime).toISOString();
}

/**
 * Checks if an in-memory ticket object is overdue.
 * Rule: status != 'Resolved' AND created_at older than 24h.
 * Resolved tickets never count as overdue.
 * @param {Object} ticket
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isTicketOverdue(ticket, now = new Date()) {
  if (!ticket || ticket.status === 'Resolved') {
    return false;
  }
  if (!ticket.created_at) {
    return false;
  }
  const createdTime = new Date(ticket.created_at).getTime();
  const cutoffTime = now.getTime() - OVERDUE_HOURS * 60 * 60 * 1000;
  return createdTime < cutoffTime;
}
