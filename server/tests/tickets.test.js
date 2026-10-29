import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import db from '../src/db/index.js';
import { resetDb } from '../src/db/init.js';

describe('Support Desk System - API & Business Rules Tests', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('1. Ticket creation validation (missing fields -> 400)', () => {
    it('should return 400 when subject is missing or empty', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          customer: 'alice@example.com',
          description: 'Cannot login to portal'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'subject' })
        ])
      );
    });

    it('should return 400 when customer is missing or empty', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Broken link',
          description: 'Footer link 404s'
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'customer' })
        ])
      );
    });

    it('should return 400 when description is missing or empty', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Broken link',
          customer: 'bob@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'description' })
        ])
      );
    });

    it('should return 400 when fields contain only whitespace characters', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: '   ',
          customer: '  \t  ',
          description: '   \n   '
        });

      expect(res.status).toBe(400);
      const fields = res.body.details.map((d) => d.field);
      expect(fields).toContain('subject');
      expect(fields).toContain('customer');
      expect(fields).toContain('description');
    });

    it('should return 400 with all missing fields reported simultaneously', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.details.length).toBeGreaterThanOrEqual(3);
      const fields = res.body.details.map((d) => d.field);
      expect(fields).toContain('subject');
      expect(fields).toContain('customer');
      expect(fields).toContain('description');
    });

    it('should return 201 on valid minimal ticket creation with default status and priority', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Valid Ticket',
          customer: 'user@example.com',
          description: 'A valid description of the issue'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('Open');
      expect(res.body.data.priority).toBe('Medium');
      expect(res.body.data.isOverdue).toBe(false);
    });
  });

  describe('2. Invalid enum -> 400', () => {
    it('should reject invalid priority on creation', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Urgent Issue',
          customer: 'user@example.com',
          description: 'Description',
          priority: 'Critical' // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'priority' })
        ])
      );
    });

    it('should reject invalid status on creation', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Issue',
          customer: 'user@example.com',
          description: 'Description',
          status: 'Closed' // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'status' })
        ])
      );
    });

    it('should reject invalid priority and status on PATCH', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Patch test',
          customer: 'user@example.com',
          description: 'Initial description'
        });

      const ticketId = created.body.data.id;

      const patchPriority = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({ priority: 'SuperUrgent' });
      expect(patchPriority.status).toBe(400);

      const patchStatus = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({ status: 'Archived' });
      expect(patchStatus.status).toBe(400);
    });

    it('should reject invalid message type on POST /messages', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Msg test',
          customer: 'user@example.com',
          description: 'Initial description'
        });

      const res = await request(app)
        .post(`/api/tickets/${created.body.data.id}/messages`)
        .send({
          type: 'comment', // Invalid, must be 'reply' or 'note'
          content: 'Some message'
        });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'type' })
        ])
      );
    });
  });

  describe('3. Overdue logic (>24h unresolved = overdue, resolved = not)', () => {
    it('marks tickets older than 24h as overdue if unresolved, but NOT overdue if Resolved', async () => {
      const now = Date.now();
      const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

      const insertStmt = db.prepare(`
        INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // 1. Overdue: >24h and Open
      const t1 = insertStmt.run('Overdue Open', 'c1', 'desc', 'High', 'Open', null, thirtyHoursAgo, thirtyHoursAgo);
      // 2. Overdue: >24h and In Progress
      const t2 = insertStmt.run('Overdue In Progress', 'c2', 'desc', 'Medium', 'In Progress', null, thirtyHoursAgo, thirtyHoursAgo);
      // 3. Overdue: >24h and Waiting on Customer
      const t3 = insertStmt.run('Overdue Waiting', 'c3', 'desc', 'Low', 'Waiting on Customer', null, thirtyHoursAgo, thirtyHoursAgo);
      // 4. NOT Overdue: >24h but Resolved
      const t4 = insertStmt.run('Resolved Old', 'c4', 'desc', 'Urgent', 'Resolved', null, thirtyHoursAgo, thirtyHoursAgo);
      // 5. NOT Overdue: <24h and Open
      const t5 = insertStmt.run('Fresh Open', 'c5', 'desc', 'Urgent', 'Open', null, twoHoursAgo, twoHoursAgo);

      const r1 = await request(app).get(`/api/tickets/${t1.lastInsertRowid}`);
      expect(r1.body.data.isOverdue).toBe(true);

      const r2 = await request(app).get(`/api/tickets/${t2.lastInsertRowid}`);
      expect(r2.body.data.isOverdue).toBe(true);

      const r3 = await request(app).get(`/api/tickets/${t3.lastInsertRowid}`);
      expect(r3.body.data.isOverdue).toBe(true);

      const r4 = await request(app).get(`/api/tickets/${t4.lastInsertRowid}`);
      expect(r4.body.data.isOverdue).toBe(false);

      const r5 = await request(app).get(`/api/tickets/${t5.lastInsertRowid}`);
      expect(r5.body.data.isOverdue).toBe(false);
    });
  });

  describe('4. Dashboard counts match data', () => {
    it('accurately computes total, open, inProgress, resolved, urgent, and overdue with business rules', async () => {
      const now = Date.now();
      const oldTime = new Date(now - 30 * 60 * 60 * 1000).toISOString(); // > 24h ago
      const recentTime = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // < 24h ago

      const insert = db.prepare(`
        INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // 1. Open, Medium, fresh
      insert.run('T1', 'c1', 'd', 'Medium', 'Open', recentTime, recentTime);
      // 2. Open, Urgent, old (counts in: total, open, urgent, overdue)
      insert.run('T2', 'c2', 'd', 'Urgent', 'Open', oldTime, oldTime);
      // 3. In Progress, High, old (counts in: total, inProgress, overdue)
      insert.run('T3', 'c3', 'd', 'High', 'In Progress', oldTime, oldTime);
      // 4. In Progress, Low, fresh (counts in: total, inProgress)
      insert.run('T4', 'c4', 'd', 'Low', 'In Progress', recentTime, recentTime);
      // 5. Waiting on Customer, High, old (counts in: total, overdue; not open or inProgress)
      insert.run('T5', 'c5', 'd', 'High', 'Waiting on Customer', oldTime, oldTime);
      // 6. Resolved, Urgent, old (resolved excludes from urgent, overdue, open, inProgress)
      insert.run('T6', 'c6', 'd', 'Urgent', 'Resolved', oldTime, oldTime);
      // 7. Resolved, Low, fresh (counts in: total, resolved)
      insert.run('T7', 'c7', 'd', 'Low', 'Resolved', recentTime, recentTime);

      const res = await request(app).get('/api/dashboard');
      expect(res.status).toBe(200);

      const stats = res.body.data;
      expect(stats.total).toBe(7);
      expect(stats.open).toBe(2); // T1, T2
      expect(stats.inProgress).toBe(2); // T3, T4
      expect(stats.resolved).toBe(2); // T6, T7
      expect(stats.urgent).toBe(1); // T2 only (T6 is Resolved, so excluded)
      expect(stats.overdue).toBe(3); // T2, T3, T5 (T6 is Resolved, so excluded)
    });
  });

  describe('5. Status/priority/assignee changes create events', () => {
    it('creates events for status, priority, and assignee changes with old and new values', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Event Test',
          customer: 'customer@test.com',
          description: 'Testing event generation',
          priority: 'Low',
          status: 'Open'
        });

      const ticketId = created.body.data.id;

      // Update status
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({ status: 'In Progress' });

      // Update priority
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({ priority: 'High' });

      // Update assignee to Alice (id: 1)
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({ assignee_id: 1 });

      const detail = await request(app).get(`/api/tickets/${ticketId}`);
      const events = detail.body.data.events;

      expect(events.length).toBe(4); // created, status_changed, priority_changed, assignee_changed
      expect(events[0].event_type).toBe('created');

      const statusEvent = events.find((e) => e.event_type === 'status_changed');
      expect(statusEvent).toBeDefined();
      expect(statusEvent.old_value).toBe('Open');
      expect(statusEvent.new_value).toBe('In Progress');

      const priorityEvent = events.find((e) => e.event_type === 'priority_changed');
      expect(priorityEvent).toBeDefined();
      expect(priorityEvent.old_value).toBe('Low');
      expect(priorityEvent.new_value).toBe('High');

      const assigneeEvent = events.find((e) => e.event_type === 'assignee_changed');
      expect(assigneeEvent).toBeDefined();
      expect(assigneeEvent.old_value).toBe('Unassigned');
      expect(assigneeEvent.new_value).toBe('Alice Johnson');
    });
  });

  describe('6. No event when value is unchanged', () => {
    it('does not create duplicate events when patching with identical values', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'No Dup Events',
          customer: 'cust@test.com',
          description: 'Testing duplicate event prevention',
          priority: 'Medium',
          status: 'Open'
        });

      const ticketId = created.body.data.id;

      // Patch with the EXACT same status and priority
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({
          status: 'Open',
          priority: 'Medium'
        });

      // Patch with only subject updated
      await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .send({
          subject: 'Updated Subject Only'
        });

      const detail = await request(app).get(`/api/tickets/${ticketId}`);
      const events = detail.body.data.events;

      // Only the initial 'created' event should exist
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe('created');
    });
  });

  describe('7. Notes vs replies stored with the correct type', () => {
    it('stores notes and replies distinctly and logs respective events', async () => {
      const created = await request(app)
        .post('/api/tickets')
        .send({
          subject: 'Note vs Reply',
          customer: 'cust@test.com',
          description: 'Messages test'
        });

      const ticketId = created.body.data.id;

      // Post internal note
      const noteRes = await request(app)
        .post(`/api/tickets/${ticketId}/messages`)
        .send({
          type: 'note',
          content: 'This is an internal note for agents only',
          author_id: 1
        });
      expect(noteRes.status).toBe(201);
      expect(noteRes.body.data.type).toBe('note');

      // Post public reply
      const replyRes = await request(app)
        .post(`/api/tickets/${ticketId}/messages`)
        .send({
          type: 'reply',
          content: 'This is a public reply sent to the customer',
          author_id: 2
        });
      expect(replyRes.status).toBe(201);
      expect(replyRes.body.data.type).toBe('reply');

      // Fetch detail and verify both are preserved with correct types and author names
      const detail = await request(app).get(`/api/tickets/${ticketId}`);
      const messages = detail.body.data.messages;

      expect(messages.length).toBe(2);
      expect(messages[0].type).toBe('note');
      expect(messages[0].author_name).toBe('Alice Johnson');

      expect(messages[1].type).toBe('reply');
      expect(messages[1].author_name).toBe('Bob Martinez');

      const events = detail.body.data.events;
      const eventTypes = events.map((e) => e.event_type);
      expect(eventTypes).toContain('note_added');
      expect(eventTypes).toContain('reply_added');
    });
  });

  describe('8. 404 for unknown ticket', () => {
    it('returns 404 for unknown ticket IDs across GET, PATCH, and POST /messages', async () => {
      const nonExistentId = 999999;

      const getRes = await request(app).get(`/api/tickets/${nonExistentId}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.error).toBeDefined();

      const patchRes = await request(app)
        .patch(`/api/tickets/${nonExistentId}`)
        .send({ status: 'Resolved' });
      expect(patchRes.status).toBe(404);
      expect(patchRes.body.error).toBeDefined();

      const msgRes = await request(app)
        .post(`/api/tickets/${nonExistentId}/messages`)
        .send({ type: 'reply', content: 'Hello' });
      expect(msgRes.status).toBe(404);
      expect(msgRes.body.error).toBeDefined();
    });
  });

  describe('9. Combined filters + search', () => {
    it('filters tickets combining multiple criteria (search, status, priority, assignee) with AND logic', async () => {
      const insert = db.prepare(`
        INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();

      // Seed 4 tickets
      insert.run('Billing error on invoice', 'john@apple.com', 'd', 'High', 'Open', 1, now, now);
      insert.run('Billing portal login issue', 'sarah@apple.com', 'd', 'Low', 'Open', 1, now, now);
      insert.run('Payment failure on checkout', 'mike@google.com', 'd', 'High', 'Open', 2, now, now);
      insert.run('Invoice tax incorrect', 'sarah@apple.com', 'd', 'High', 'Resolved', 1, now, now);

      // Search 'Billing' + status 'Open' + priority 'High' + assignee '1'
      const res = await request(app)
        .get('/api/tickets?search=Billing&status=Open&priority=High&assignee=1');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].subject).toBe('Billing error on invoice');
      expect(res.body.data[0].customer).toBe('john@apple.com');

      // Search customer 'apple.com' matching both John and Sarah
      const customerSearch = await request(app).get('/api/tickets?search=apple.com');
      expect(customerSearch.body.data.length).toBe(3);
    });
  });

  describe('10. Priority sort order', () => {
    it('sorts tickets by priority in order: Urgent > High > Medium > Low', async () => {
      const insert = db.prepare(`
        INSERT INTO tickets (subject, customer, description, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();

      insert.run('Low Ticket', 'c1', 'd', 'Low', 'Open', now, now);
      insert.run('Urgent Ticket', 'c2', 'd', 'Urgent', 'Open', now, now);
      insert.run('Medium Ticket', 'c3', 'd', 'Medium', 'Open', now, now);
      insert.run('High Ticket', 'c4', 'd', 'High', 'Open', now, now);

      const res = await request(app).get('/api/tickets?sort=priority');
      expect(res.status).toBe(200);

      const priorities = res.body.data.map((t) => t.priority);
      expect(priorities).toEqual(['Urgent', 'High', 'Medium', 'Low']);
    });
  });
});
