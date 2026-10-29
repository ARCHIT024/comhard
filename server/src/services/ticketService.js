import db from '../db/index.js';
import { isTicketOverdue, getOverdueCutoffIso } from './businessRules.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

export const ticketService = {
  /**
   * Retrieves all agents
   */
  async getAgents() {
    const stmt = db.prepare('SELECT id, name, email, role FROM agents ORDER BY id ASC');
    return stmt.all();
  },

  /**
   * Lists tickets with optional search, filters, priority/updated sorting, and pagination.
   */
  async getAllTickets(query = {}) {
    const {
      search,
      status,
      priority,
      assignee,
      sort = 'updated',
      page = 1,
      limit = 10
    } = query;

    const conditions = [];
    const params = [];

    // Search matches subject or customer
    if (search && search.trim()) {
      conditions.push('(t.subject LIKE ? OR t.customer LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter by status
    if (status && status.trim()) {
      conditions.push('t.status = ?');
      params.push(status.trim());
    }

    // Filter by priority
    if (priority && priority.trim()) {
      conditions.push('t.priority = ?');
      params.push(priority.trim());
    }

    // Filter by assignee
    if (assignee !== undefined && assignee !== null && assignee !== '') {
      if (assignee === 'unassigned') {
        conditions.push('t.assignee_id IS NULL');
      } else if (!isNaN(Number(assignee))) {
        conditions.push('t.assignee_id = ?');
        params.push(Number(assignee));
      } else {
        conditions.push('(a.name LIKE ? OR a.email LIKE ?)');
        const assigneeTerm = `%${assignee.trim()}%`;
        params.push(assigneeTerm, assigneeTerm);
      }
    }

    // Filter by overdue (status != 'Resolved' AND created_at < 24h ago)
    if (query.overdue === 'true' || query.overdue === true) {
      const cutoffIso = getOverdueCutoffIso();
      conditions.push("t.status != 'Resolved' AND t.created_at < ?");
      params.push(cutoffIso);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting rule:
    // priority sort = Urgent > High > Medium > Low (secondary: updated_at DESC)
    // updated sort = updated_at DESC
    let orderByClause = 'ORDER BY t.updated_at DESC';
    if (sort === 'priority') {
      orderByClause = `
        ORDER BY 
          CASE t.priority
            WHEN 'Urgent' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END ASC,
          t.updated_at DESC
      `;
    }

    // Count total matching records for pagination
    const countSql = `
      SELECT COUNT(*) as total 
      FROM tickets t
      LEFT JOIN agents a ON t.assignee_id = a.id
      ${whereClause}
    `;
    const totalRow = db.prepare(countSql).get(...params);
    const total = Number(totalRow?.total || 0);

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = parseInt(limit, 10);
    const currentLimit = parsedLimit > 0 ? parsedLimit : 10;
    const offset = (currentPage - 1) * currentLimit;
    const totalPages = Math.ceil(total / currentLimit) || 1;

    // Fetch paginated tickets
    const dataSql = `
      SELECT 
        t.id,
        t.subject,
        t.customer,
        t.description,
        t.priority,
        t.status,
        t.assignee_id,
        t.created_at,
        t.updated_at,
        a.name as assignee_name,
        a.email as assignee_email
      FROM tickets t
      LEFT JOIN agents a ON t.assignee_id = a.id
      ${whereClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(dataSql).all(...params, currentLimit, offset);

    // Compute isOverdue flag using shared helper
    const tickets = rows.map((ticket) => ({
      ...ticket,
      isOverdue: isTicketOverdue(ticket)
    }));

    return {
      data: tickets,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages
    };
  },

  /**
   * Retrieves a single ticket by ID along with its messages and audit events
   */
  async getTicketById(id) {
    const ticketStmt = db.prepare(`
      SELECT 
        t.id,
        t.subject,
        t.customer,
        t.description,
        t.priority,
        t.status,
        t.assignee_id,
        t.created_at,
        t.updated_at,
        a.name as assignee_name,
        a.email as assignee_email
      FROM tickets t
      LEFT JOIN agents a ON t.assignee_id = a.id
      WHERE t.id = ?
    `);

    const ticket = ticketStmt.get(id);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Messages in chronological order
    const messagesStmt = db.prepare(`
      SELECT 
        m.id,
        m.ticket_id,
        m.type,
        m.content,
        m.author_id,
        m.created_at,
        a.name as author_name,
        a.email as author_email
      FROM ticket_messages m
      LEFT JOIN agents a ON m.author_id = a.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC, m.id ASC
    `);
    const messages = messagesStmt.all(id);

    // Events in chronological order
    const eventsStmt = db.prepare(`
      SELECT 
        e.id,
        e.ticket_id,
        e.event_type,
        e.old_value,
        e.new_value,
        e.actor_id,
        e.created_at,
        a.name as actor_name,
        a.email as actor_email
      FROM ticket_events e
      LEFT JOIN agents a ON e.actor_id = a.id
      WHERE e.ticket_id = ?
      ORDER BY e.created_at ASC, e.id ASC
    `);
    const events = eventsStmt.all(id);

    return {
      ...ticket,
      isOverdue: isTicketOverdue(ticket),
      messages,
      events
    };
  },

  /**
   * Creates a new ticket with initial creation event inside a transaction.
   */
  async createTicket(payload) {
    const {
      subject,
      customer,
      description,
      priority = 'Medium',
      status = 'Open',
      assignee_id = null,
      actor_id = null
    } = payload;

    // Verify assignee exists if provided
    if (assignee_id !== null && assignee_id !== undefined) {
      const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(assignee_id);
      if (!agent) {
        throw new ValidationError([{ field: 'assignee_id', message: 'Assigned agent does not exist.' }]);
      }
    }

    const nowIso = new Date().toISOString();

    const insertTransaction = db.transaction(() => {
      // 1. Insert ticket
      const insertTicketStmt = db.prepare(`
        INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insertTicketStmt.run(
        subject.trim(),
        customer.trim(),
        description.trim(),
        priority,
        status,
        assignee_id || null,
        nowIso,
        nowIso
      );

      const ticketId = result.lastInsertRowid;

      // 2. Insert creation event
      const insertEventStmt = db.prepare(`
        INSERT INTO ticket_events (ticket_id, event_type, old_value, new_value, actor_id, created_at)
        VALUES (?, 'created', NULL, ?, ?, ?)
      `);
      insertEventStmt.run(
        ticketId,
        `Ticket created: ${subject.trim()}`,
        actor_id || assignee_id || null,
        nowIso
      );

      return ticketId;
    });

    const ticketId = insertTransaction();
    return this.getTicketById(ticketId);
  },

  /**
   * Updates an existing ticket and logs changes to status, priority, and assignee.
   * Transactional and only logs fields that actually changed.
   */
  async updateTicket(id, updates) {
    const currentTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    if (!currentTicket) {
      throw new NotFoundError(`Ticket with ID ${id} not found`);
    }

    // Verify assignee if provided
    if (updates.assignee_id !== undefined && updates.assignee_id !== null) {
      const agent = db.prepare('SELECT id, name FROM agents WHERE id = ?').get(updates.assignee_id);
      if (!agent) {
        throw new ValidationError([{ field: 'assignee_id', message: 'Assigned agent does not exist.' }]);
      }
    }

    const nowIso = new Date().toISOString();

    const updateTx = db.transaction(() => {
      const eventsToRecord = [];

      // Check status change
      if (updates.status !== undefined && updates.status !== currentTicket.status) {
        eventsToRecord.push({
          type: 'status_changed',
          oldVal: currentTicket.status,
          newVal: updates.status
        });
      }

      // Check priority change
      if (updates.priority !== undefined && updates.priority !== currentTicket.priority) {
        eventsToRecord.push({
          type: 'priority_changed',
          oldVal: currentTicket.priority,
          newVal: updates.priority
        });
      }

      // Check assignee change
      const incomingAssignee = updates.assignee_id === undefined ? currentTicket.assignee_id : (updates.assignee_id || null);
      if (incomingAssignee !== currentTicket.assignee_id) {
        let oldAssigneeName = 'Unassigned';
        if (currentTicket.assignee_id) {
          const oldAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(currentTicket.assignee_id);
          oldAssigneeName = oldAgent ? oldAgent.name : `Agent #${currentTicket.assignee_id}`;
        }

        let newAssigneeName = 'Unassigned';
        if (incomingAssignee) {
          const newAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(incomingAssignee);
          newAssigneeName = newAgent ? newAgent.name : `Agent #${incomingAssignee}`;
        }

        eventsToRecord.push({
          type: 'assignee_changed',
          oldVal: oldAssigneeName,
          newVal: newAssigneeName
        });
      }

      // Prepare updated ticket values
      const newSubject = updates.subject !== undefined ? updates.subject.trim() : currentTicket.subject;
      const newCustomer = updates.customer !== undefined ? updates.customer.trim() : currentTicket.customer;
      const newDescription = updates.description !== undefined ? updates.description.trim() : currentTicket.description;
      const newPriority = updates.priority !== undefined ? updates.priority : currentTicket.priority;
      const newStatus = updates.status !== undefined ? updates.status : currentTicket.status;
      const newAssigneeId = incomingAssignee;

      // Update tickets table
      const updateStmt = db.prepare(`
        UPDATE tickets
        SET subject = ?,
            customer = ?,
            description = ?,
            priority = ?,
            status = ?,
            assignee_id = ?,
            updated_at = ?
        WHERE id = ?
      `);
      updateStmt.run(
        newSubject,
        newCustomer,
        newDescription,
        newPriority,
        newStatus,
        newAssigneeId,
        nowIso,
        id
      );

      // Record audit events for changed fields
      const insertEventStmt = db.prepare(`
        INSERT INTO ticket_events (ticket_id, event_type, old_value, new_value, actor_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const ev of eventsToRecord) {
        insertEventStmt.run(
          id,
          ev.type,
          ev.oldVal,
          ev.newVal,
          updates.actor_id || null,
          nowIso
        );
      }
    });

    updateTx();
    return this.getTicketById(id);
  },

  /**
   * Adds a reply or internal note to a ticket, logging an event and bumping updated_at.
   */
  async addMessage(ticketId, { type, content, author_id = null }) {
    const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Ticket with ID ${ticketId} not found`);
    }

    if (author_id) {
      const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(author_id);
      if (!agent) {
        throw new ValidationError([{ field: 'author_id', message: 'Author agent does not exist.' }]);
      }
    }

    const nowIso = new Date().toISOString();

    const messageTx = db.transaction(() => {
      // 1. Insert message
      const insertMsgStmt = db.prepare(`
        INSERT INTO ticket_messages (ticket_id, type, content, author_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      const msgResult = insertMsgStmt.run(
        ticketId,
        type,
        content.trim(),
        author_id || null,
        nowIso
      );

      // 2. Insert event
      const eventType = type === 'reply' ? 'reply_added' : 'note_added';
      const previewContent = content.trim().length > 100 
        ? content.trim().slice(0, 97) + '...' 
        : content.trim();

      const insertEventStmt = db.prepare(`
        INSERT INTO ticket_events (ticket_id, event_type, old_value, new_value, actor_id, created_at)
        VALUES (?, ?, NULL, ?, ?, ?)
      `);
      insertEventStmt.run(
        ticketId,
        eventType,
        previewContent,
        author_id || null,
        nowIso
      );

      // 3. Touch ticket updated_at
      db.prepare('UPDATE tickets SET updated_at = ? WHERE id = ?').run(nowIso, ticketId);

      return msgResult.lastInsertRowid;
    });

    const messageId = messageTx();

    const createdMsg = db.prepare(`
      SELECT 
        m.id,
        m.ticket_id,
        m.type,
        m.content,
        m.author_id,
        m.created_at,
        a.name as author_name,
        a.email as author_email
      FROM ticket_messages m
      LEFT JOIN agents a ON m.author_id = a.id
      WHERE m.id = ?
    `).get(messageId);

    return createdMsg;
  },

  /**
   * Computes dashboard statistics using SQL aggregation over real saved ticket data.
   * Business rules:
   * - Resolved tickets don't count as open, in-progress, or overdue.
   * - Urgent count excludes Resolved tickets.
   * - Overdue: status != 'Resolved' AND created_at older than 24h.
   */
  async getDashboardStats() {
    const cutoffIso = getOverdueCutoffIso();

    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'Urgent' AND status != 'Resolved' THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN status != 'Resolved' AND created_at < ? THEN 1 ELSE 0 END) as overdue
      FROM tickets
    `;

    const row = db.prepare(sql).get(cutoffIso);

    return {
      total: Number(row?.total || 0),
      open: Number(row?.open || 0),
      inProgress: Number(row?.inProgress || 0),
      resolved: Number(row?.resolved || 0),
      urgent: Number(row?.urgent || 0),
      overdue: Number(row?.overdue || 0)
    };
  }
};

export default ticketService;
