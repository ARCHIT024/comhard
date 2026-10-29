import db from './index.js';
import { initDb } from './init.js';

export function seed() {
  // Ensure schema and demo agents exist
  initDb();

  console.log('Clearing existing tickets, messages, and events for clean seeding...');
  db.exec('DELETE FROM ticket_events;');
  db.exec('DELETE FROM ticket_messages;');
  db.exec('DELETE FROM tickets;');

  const agents = db.prepare('SELECT id, name FROM agents ORDER BY id ASC').all();
  const alice = agents[0]?.id || 1;
  const bob = agents[1]?.id || 2;
  const charlie = agents[2]?.id || 3;

  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();
  const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();

  const ticketsData = [
    {
      subject: 'Critical production database connection timeouts',
      customer: 'alex.rivera@fintechcorp.io',
      description: 'Our primary payment processing cluster has started throwing pool exhaustion errors under peak load.',
      priority: 'Urgent',
      status: 'Open',
      assignee_id: alice,
      created_at: hoursAgo(72), // 3 days ago -> OVERDUE
      updated_at: hoursAgo(72),
      messages: [
        { type: 'note', content: 'Checked server logs, max connections reached around 14:00 UTC.', author_id: alice, created_at: hoursAgo(70) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Critical production database connection timeouts', actor_id: alice, created_at: hoursAgo(72) },
        { event_type: 'note_added', old_value: null, new_value: 'Checked server logs, max connections reached around 14:00 UTC.', actor_id: alice, created_at: hoursAgo(70) }
      ]
    },
    {
      subject: 'SSL certificate expiring in 48 hours on auth subdomains',
      customer: 'sec-ops@cloudnative.dev',
      description: 'The wildcard cert for *.auth.acme.com is set to expire this Friday. Automated renewal hook failed with DNS challenge error.',
      priority: 'High',
      status: 'In Progress',
      assignee_id: bob,
      created_at: hoursAgo(48), // 2 days ago -> OVERDUE
      updated_at: hoursAgo(20),
      messages: [
        { type: 'reply', content: 'Investigating the Cloudflare API token permissions now.', author_id: bob, created_at: hoursAgo(40) },
        { type: 'note', content: 'Token lacked Zone:DNS:Edit scope. Re-generating credentials.', author_id: bob, created_at: hoursAgo(20) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: SSL certificate expiring', actor_id: bob, created_at: hoursAgo(48) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'In Progress', actor_id: bob, created_at: hoursAgo(40) },
        { event_type: 'reply_added', old_value: null, new_value: 'Investigating the Cloudflare API token permissions now.', actor_id: bob, created_at: hoursAgo(40) },
        { event_type: 'note_added', old_value: null, new_value: 'Token lacked Zone:DNS:Edit scope. Re-generating credentials.', actor_id: bob, created_at: hoursAgo(20) }
      ]
    },
    {
      subject: 'User unable to export monthly billing statements to CSV',
      customer: 'sarah.connor@cyberdyne.net',
      description: 'Clicking Export CSV triggers a 504 Gateway Timeout error for date ranges spanning over 90 days.',
      priority: 'Medium',
      status: 'Waiting on Customer',
      assignee_id: charlie,
      created_at: hoursAgo(30), // 30h ago -> OVERDUE
      updated_at: hoursAgo(25),
      messages: [
        { type: 'reply', content: 'Hi Sarah, could you confirm which specific organization account ID you are exporting for?', author_id: charlie, created_at: hoursAgo(28) },
        { type: 'note', content: 'Likely an unindexed range query on the invoices table.', author_id: charlie, created_at: hoursAgo(25) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: User unable to export monthly billing statements', actor_id: charlie, created_at: hoursAgo(30) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'Waiting on Customer', actor_id: charlie, created_at: hoursAgo(28) },
        { event_type: 'reply_added', old_value: null, new_value: 'Hi Sarah, could you confirm which specific organization account ID...', actor_id: charlie, created_at: hoursAgo(28) }
      ]
    },
    {
      subject: 'SSO login loop with Okta identity provider',
      customer: 'marcus.vance@enterprise.org',
      description: 'Employees are redirected back to the login screen after entering 2FA code. Session cookie seems to be rejected.',
      priority: 'Urgent',
      status: 'Resolved', // RESOLVED -> NOT OVERDUE despite being 50h old
      assignee_id: alice,
      created_at: hoursAgo(50),
      updated_at: hoursAgo(10),
      messages: [
        { type: 'reply', content: 'We identified a clock skew issue on the SAML assertion validator. Fix deployed.', author_id: alice, created_at: hoursAgo(12) },
        { type: 'note', content: 'Customer verified login is working normally across all regions.', author_id: alice, created_at: hoursAgo(10) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: SSO login loop with Okta', actor_id: alice, created_at: hoursAgo(50) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'In Progress', actor_id: alice, created_at: hoursAgo(30) },
        { event_type: 'status_changed', old_value: 'In Progress', new_value: 'Resolved', actor_id: alice, created_at: hoursAgo(10) }
      ]
    },
    {
      subject: 'Urgent security report: Webhook endpoint signature verification bypass',
      customer: 'bug-bounty@whitehat.io',
      description: 'Found that empty HMAC signatures bypass verification when algorithm header is set to "none".',
      priority: 'Urgent',
      status: 'Open',
      assignee_id: charlie,
      created_at: hoursAgo(18), // 18h ago -> NOT overdue (<24h), but URGENT
      updated_at: hoursAgo(18),
      messages: [],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Webhook endpoint signature verification bypass', actor_id: charlie, created_at: hoursAgo(18) }
      ]
    },
    {
      subject: 'Webhook delivery retries failing exponentially for Slack integration',
      customer: 'dev-team@startuphub.co',
      description: 'Slack events are backing up in the retry queue due to strict 3-second acknowledgement deadlines.',
      priority: 'High',
      status: 'In Progress',
      assignee_id: bob,
      created_at: hoursAgo(14),
      updated_at: hoursAgo(5),
      messages: [
        { type: 'note', content: 'Moving webhook processing to asynchronous background worker queue.', author_id: bob, created_at: hoursAgo(5) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Webhook delivery retries failing', actor_id: bob, created_at: hoursAgo(14) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'In Progress', actor_id: bob, created_at: hoursAgo(8) }
      ]
    },
    {
      subject: 'Typography and alignment glitch in dark mode navigation bar',
      customer: 'elena.rostova@designagency.com',
      description: 'On screens smaller than 1440px, the user avatar overlaps with the notifications bell icon when dark theme is enabled.',
      priority: 'Low',
      status: 'Open',
      assignee_id: null, // Unassigned
      created_at: hoursAgo(8),
      updated_at: hoursAgo(8),
      messages: [],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Typography and alignment glitch in dark mode', actor_id: null, created_at: hoursAgo(8) }
      ]
    },
    {
      subject: 'Need assistance setting up custom domain with DNSSEC',
      customer: 'jordan.lee@fintechgroup.org',
      description: 'Configuring CNAME for portal.fintechgroup.org and need DS records to establish chain of trust.',
      priority: 'Medium',
      status: 'Waiting on Customer',
      assignee_id: alice,
      created_at: hoursAgo(6),
      updated_at: hoursAgo(4),
      messages: [
        { type: 'reply', content: 'Hello Jordan, here are the DNSSEC public keys you need to add to your registrar.', author_id: alice, created_at: hoursAgo(4) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: DNSSEC custom domain assistance', actor_id: alice, created_at: hoursAgo(6) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'Waiting on Customer', actor_id: alice, created_at: hoursAgo(4) }
      ]
    },
    {
      subject: 'Password reset email not received for corporate domain',
      customer: 'david.b@megacorp.com',
      description: 'Several employees from the @megacorp.com domain are not receiving account recovery links.',
      priority: 'High',
      status: 'Open',
      assignee_id: null, // Unassigned
      created_at: hoursAgo(3),
      updated_at: hoursAgo(3),
      messages: [],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Password reset email not received', actor_id: null, created_at: hoursAgo(3) }
      ]
    },
    {
      subject: 'Invoice PDF generation contains incorrect tax rate for EU client',
      customer: 'claire.dubois@paris-retail.fr',
      description: 'VAT on invoice #INV-9281 was charged at 21% instead of French standard 20%.',
      priority: 'Medium',
      status: 'Resolved',
      assignee_id: bob,
      created_at: hoursAgo(96), // 4 days ago
      updated_at: hoursAgo(24),
      messages: [
        { type: 'reply', content: 'Corrected invoice #INV-9281-R has been reissued and the difference credited.', author_id: bob, created_at: hoursAgo(24) }
      ],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: Invoice PDF tax rate incorrect', actor_id: bob, created_at: hoursAgo(96) },
        { event_type: 'status_changed', old_value: 'Open', new_value: 'Resolved', actor_id: bob, created_at: hoursAgo(24) }
      ]
    },
    {
      subject: 'API rate limit threshold exceeded unexpectedly during batch sync',
      customer: 'integrations@datadynamics.io',
      description: 'Our midnight ETL job hit HTTP 429 even though we kept requests below the documented 120 req/min quota.',
      priority: 'Urgent',
      status: 'Open',
      assignee_id: alice,
      created_at: minutesAgo(45), // 45m ago -> Fresh Urgent
      updated_at: minutesAgo(45),
      messages: [],
      events: [
        { event_type: 'created', old_value: null, new_value: 'Ticket created: API rate limit threshold exceeded', actor_id: alice, created_at: minutesAgo(45) }
      ]
    }
  ];

  const insertTicketStmt = db.prepare(`
    INSERT INTO tickets (subject, customer, description, priority, status, assignee_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMsgStmt = db.prepare(`
    INSERT INTO ticket_messages (ticket_id, type, content, author_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertEventStmt = db.prepare(`
    INSERT INTO ticket_events (ticket_id, event_type, old_value, new_value, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedTx = db.transaction(() => {
    for (const t of ticketsData) {
      const res = insertTicketStmt.run(
        t.subject,
        t.customer,
        t.description,
        t.priority,
        t.status,
        t.assignee_id,
        t.created_at,
        t.updated_at
      );

      const ticketId = res.lastInsertRowid;

      for (const m of t.messages) {
        insertMsgStmt.run(ticketId, m.type, m.content, m.author_id, m.created_at);
      }

      for (const ev of t.events) {
        insertEventStmt.run(ticketId, ev.event_type, ev.old_value, ev.new_value, ev.actor_id, ev.created_at);
      }
    }
  });

  seedTx();
  console.log(`Seeded ${ticketsData.length} tickets with messages and activity events.`);
}

// Run directly if invoked
seed();
