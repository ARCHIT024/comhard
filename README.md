# Support Desk System

A lightweight, robust customer support platform designed for small teams to receive, organize, assign, and resolve customer issues with a full audit trail and service performance analytics.

Built according to the Full-Stack Engineering Practical Coding Challenge brief.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js (v24), Express 4, Native SQLite (`node:sqlite`) with WAL mode and foreign key enforcement |
| **Frontend Client** | React 18, Vite 6, React Router 7, Vanilla CSS design system, Lucide React (icons) |
| **Testing** | Vitest, Supertest (isolated in-memory SQLite database) |
| **Architecture** | Monorepo structure with `/server` and `/client` |

---

## Prerequisites

- **Node.js**: v22.0.0+ or v24.0.0+ (recommended for built-in `node:sqlite` support without requiring native C++ build tools)
- **npm**: v10.0.0+

---

## Setup & Running the Application

### 1. Clone & Install Dependencies

From the project root:

```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../client
npm install
```

### 2. Database Initialization & Seeding

```bash
cd server

# Initialize database schema and ensure default demo agents exist
npm run db:init

# Seed 11 realistic, varied tickets (including overdue, in-progress, urgent, and resolved tickets)
npm run db:seed
```

### 3. Start the Backend Server

```bash
cd server
npm run dev
```
*Backend runs on **http://localhost:4000** with native Node `--watch` mode.*

### 4. Start the Frontend Client

In a separate terminal:

```bash
cd client
npm run dev
```
*Frontend runs on **http://localhost:5173**. Vite automatically proxies any `/api/*` request to `http://localhost:4000`.*

### 5. Run Backend Unit & Integration Tests

```bash
cd server
npm test
```
*Executes all 18 test cases in Vitest with an isolated `:memory:` database.*

---

## Environment Variables

The server configuration defaults to sensible values out of the box. An example configuration is provided at [`server/.env.example`](file:///c:/Users/archi/Downloads/Desktop/comhard/server/.env.example):

```env
# Server port
PORT=4000

# Environment mode
NODE_ENV=development

# Optional custom database path (defaults to ./support_desk.db)
# Set to :memory: for automated in-memory tests
# DB_PATH=./support_desk.db
```

To customize, copy the file to `server/.env`:
```bash
cp server/.env.example server/.env
```

---

## Database Schema Explanation

SQLite foreign keys are strictly enforced on every connection (`PRAGMA foreign_keys = ON;`). All timestamps are formatted and stored as standard ISO 8601 UTC strings (`new Date().toISOString()`).

### 1. `agents`
Represents customer support representatives and leads.
- `id INTEGER PRIMARY KEY AUTOINCREMENT`: Unique identifier.
- `name TEXT NOT NULL`: Full name of the agent.
- `email TEXT NOT NULL UNIQUE`: Contact email address.
- `role TEXT NOT NULL DEFAULT 'agent'`: Role classification (`agent`, `lead`).
- *Seeded with 3 demo agents: Alice Johnson, Bob Martinez, Charlie Kim.*

### 2. `tickets`
Core entity for customer inquiries and incidents.
- `id INTEGER PRIMARY KEY AUTOINCREMENT`: Ticket number.
- `subject TEXT NOT NULL`: Title or summary.
- `customer TEXT NOT NULL`: Customer identifier (name or email).
- `description TEXT NOT NULL`: Detailed issue context.
- `priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')) DEFAULT 'Medium'`.
- `status TEXT NOT NULL CHECK(status IN ('Open', 'In Progress', 'Waiting on Customer', 'Resolved')) DEFAULT 'Open'`.
- `assignee_id INTEGER REFERENCES agents(id) ON DELETE SET NULL`: Assigned support agent.
- `created_at TEXT NOT NULL`: ISO UTC creation timestamp.
- `updated_at TEXT NOT NULL`: ISO UTC timestamp updated whenever fields change or new messages arrive.

### 3. `ticket_messages`
Stores both public replies and private internal notes.
- `id INTEGER PRIMARY KEY AUTOINCREMENT`: Message ID.
- `ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE`: Foreign key.
- `type TEXT NOT NULL CHECK(type IN ('reply', 'note'))`:
  - `'reply'`: Public reply intended for the customer.
  - `'note'`: Internal agent note visible only to support staff.
- `content TEXT NOT NULL`: Message body.
- `author_id INTEGER REFERENCES agents(id) ON DELETE SET NULL`: Author agent ID.
- `created_at TEXT NOT NULL`: ISO UTC timestamp.

### 4. `ticket_events`
Audit history logging every lifecycle action for auditing and compliance.
- `id INTEGER PRIMARY KEY AUTOINCREMENT`: Event record ID.
- `ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE`: Foreign key.
- `event_type TEXT NOT NULL`: Action category (`created`, `status_changed`, `priority_changed`, `assignee_changed`, `reply_added`, `note_added`).
- `old_value TEXT`: Previous value before the change.
- `new_value TEXT`: Updated value after the change.
- `actor_id INTEGER REFERENCES agents(id) ON DELETE SET NULL`: Support agent who performed the action.
- `created_at TEXT NOT NULL`: ISO UTC timestamp.

---

## API Endpoints & Examples

All API routes are prefixed under `/api`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agents` | List all available agents |
| `GET` | `/api/dashboard` | Computed KPI statistics from real SQLite data |
| `GET` | `/api/tickets` | List tickets with combinable filters, search, sorting, and pagination |
| `POST` | `/api/tickets` | Create a new ticket (validates required fields and enums) |
| `GET` | `/api/tickets/:id` | Fetch full ticket record with chronological messages, events, and overdue flag |
| `PATCH`| `/api/tickets/:id` | Update ticket fields (status, priority, assignee, subject, etc.) |
| `POST` | `/api/tickets/:id/messages` | Add a public reply or internal note |
| `DELETE`| `/api/tickets/:id` | Disallowed; returns `405 Method Not Allowed` |

---

### Request & Response Examples

#### 1. `GET /api/dashboard`
**Response (200 OK):**
```json
{
  "data": {
    "total": 11,
    "open": 5,
    "inProgress": 2,
    "resolved": 2,
    "urgent": 3,
    "overdue": 3
  }
}
```

#### 2. `GET /api/tickets?search=database&status=Open&priority=Urgent`
**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "subject": "Critical production database connection timeouts",
      "customer": "alex.rivera@fintechcorp.io",
      "description": "Our primary payment processing cluster has started throwing pool exhaustion errors under peak load.",
      "priority": "Urgent",
      "status": "Open",
      "assignee_id": 1,
      "assignee_name": "Alice Johnson",
      "assignee_email": "alice@supportdesk.internal",
      "created_at": "2026-10-26T01:16:11.000Z",
      "updated_at": "2026-10-26T01:16:11.000Z",
      "isOverdue": true
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### 3. `POST /api/tickets`
**Request:**
```json
{
  "subject": "Unable to access billing invoices",
  "customer": "marcus@enterprise.com",
  "description": "Invoices page displays a blank white screen after login.",
  "priority": "High",
  "status": "Open",
  "assignee_id": 2
}
```
**Response (201 Created):**
```json
{
  "data": {
    "id": 12,
    "subject": "Unable to access billing invoices",
    "customer": "marcus@enterprise.com",
    "description": "Invoices page displays a blank white screen after login.",
    "priority": "High",
    "status": "Open",
    "assignee_id": 2,
    "assignee_name": "Bob Martinez",
    "created_at": "2026-10-29T02:00:00.000Z",
    "updated_at": "2026-10-29T02:00:00.000Z",
    "isOverdue": false,
    "messages": [],
    "events": [
      {
        "id": 25,
        "event_type": "created",
        "new_value": "Ticket created: Unable to access billing invoices",
        "actor_name": "Bob Martinez",
        "created_at": "2026-10-29T02:00:00.000Z"
      }
    ]
  }
}
```

#### 4. `POST /api/tickets` (Validation Error on Whitespace / Missing Fields)
**Request:**
```json
{
  "subject": "   ",
  "customer": ""
}
```
**Response (400 Bad Request):**
```json
{
  "error": "Invalid ticket payload",
  "details": [
    { "field": "subject", "message": "Subject is required." },
    { "field": "customer", "message": "Customer identifier (name or email) is required." },
    { "field": "description", "message": "Description is required." }
  ]
}
```

#### 5. `POST /api/tickets/:id/messages`
**Request:**
```json
{
  "type": "note",
  "content": "Checked server logs; database pool was exhausted between 14:00-14:30 UTC.",
  "author_id": 1
}
```
**Response (201 Created):**
```json
{
  "data": {
    "id": 8,
    "ticket_id": 1,
    "type": "note",
    "content": "Checked server logs; database pool was exhausted between 14:00-14:30 UTC.",
    "author_id": 1,
    "author_name": "Alice Johnson",
    "author_email": "alice@supportdesk.internal",
    "created_at": "2026-10-29T02:05:00.000Z"
  }
}
```

#### 6. `DELETE /api/tickets/:id` (Policy Enforcement)
**Response (405 Method Not Allowed):**
```json
{
  "error": "Ticket deletion is prohibited by system audit policy.",
  "policy": "No-deletion audit policy. Ticket destruction is prohibited to maintain complete history."
}
```

---

## Architecture Overview

```text
comhard/
├── .gitignore
├── README.md
├── client/                               # Frontend React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                   # Configured proxy (/api -> :4000)
│   └── src/
│       ├── main.jsx                     # Entry point
│       ├── App.jsx                      # React Router routes and providers
│       ├── index.css                    # Vanilla CSS tokens, utilities, and components
│       ├── api/
│       │   └── client.js                # Fetch wrapper, ApiError & field error extractor
│       ├── context/
│       │   └── AgentContext.jsx         # Global active agent state switcher
│       ├── hooks/
│       │   └── useDebounce.js           # Debounce utility hook for search input
│       ├── utils/
│       │   └── formatDate.js            # Relative and formatted time helpers
│       ├── components/                  # Reusable UI elements
│       │   ├── Layout.jsx               # Sidebar, header, breadcrumbs, agent switcher
│       │   ├── StatusBadge.jsx          # Color-coded status badge
│       │   ├── PriorityBadge.jsx        # Color-coded priority badge
│       │   ├── OverdueBadge.jsx         # Red overdue indicator tag
│       │   ├── Spinner.jsx              # Loading spinner
│       │   ├── EmptyState.jsx           # Empty state with clear filters button
│       │   └── ErrorBanner.jsx          # Error banner with retry action
│       └── pages/
│           ├── DashboardPage.jsx        # KPI metric cards, overdue banner, filter links
│           ├── TicketsPage.jsx          # Search, filters, sort, table, pagination
│           ├── NewTicketPage.jsx        # Inbound ticket creation form with validation
│           └── TicketDetailPage.jsx     # Header, instant dropdowns, quick resolve, chat
└── server/                              # Backend Node.js + Express + SQLite API
    ├── package.json
    ├── vitest.config.js                 # Vitest test configuration (:memory: SQLite)
    ├── .env.example
    ├── src/
    │   ├── index.js                     # Express app setup, middleware, error handler
    │   ├── db/
    │   │   ├── index.js                 # SQLite connection & transaction wrapper
    │   │   ├── schema.sql               # SQLite DDL tables, foreign keys, and indexes
    │   │   ├── init.js                  # Schema initialization and agent seeding
    │   │   └── seed.js                  # 11 sample tickets (overdue, urgent, resolved)
    │   ├── routes/
    │   │   ├── index.js                 # Central /api router
    │   │   └── ticketRoutes.js          # Routes for /api/tickets, /api/tickets/:id
    │   ├── controllers/
    │   │   └── ticketController.js      # HTTP request handling and response binding
    │   ├── services/
    │   │   ├── businessRules.js         # Shared overdue cutoff logic & enums
    │   │   └── ticketService.js         # Database queries, transactions, audit events
    │   └── middleware/
    │       ├── errorHandler.js          # Global error handler & custom error classes
    │       └── validation.js            # Request payload validation middleware
    └── tests/
        └── tickets.test.js              # Vitest test suite covering 18 integration tests
```

### Separation of Concerns
1. **Routes (`/routes`)**: Focus purely on mapping HTTP endpoints to controllers and attaching route-specific middleware.
2. **Controllers (`/controllers`)**: Extract inputs from HTTP requests, delegate execution to services, and format standardized JSON HTTP responses.
3. **Services (`/services`)**: Contain all database queries, domain logic, calculations, and transactional integrity (e.g. atomic writes of tickets and audit event records).
4. **Middleware (`/middleware`)**: Centralize request validation and uniform error handling across the entire API.
5. **Database (`/db`)**: Manages the SQLite database connection, PRAGMA settings, schema migration, and seed data.

---

## Design Decisions & Assumptions

### 1. Deletion Disallowed (`405 Method Not Allowed`)
- **Decision**: Neither tickets nor messages can be deleted via the API or frontend.
- **Rationale**: Customer support systems require complete, tamper-evident audit trails for dispute resolution, compliance, and SLA tracking. Orphaned child records are avoided, and all historical events remain permanent.

### 2. Overdue Rule & Shared Cutoff Logic
- **Decision**: A ticket is classified as overdue if and only if `status != 'Resolved' AND created_at < 24 hours ago`.
- **Rationale**: Implemented via a single shared helper ([`businessRules.js`](file:///c:/Users/archi/Downloads/Desktop/comhard/server/src/services/businessRules.js)) utilized by both the ticket listing endpoint (`isOverdue` boolean flag) and the dashboard SQL aggregation query (`SUM(...) AS overdue`). Resolved tickets are strictly excluded from open, in-progress, urgent, and overdue counts.

### 3. Demo Agents Without Password Login
- **Decision**: A lightweight **"Active Agent"** switcher is placed directly in the top header (persisted in client state) rather than enforcing an authentication wall.
- **Rationale**: Keeps evaluation frictionless while fully demonstrating multi-agent workflows. Actions (creating tickets, posting replies, leaving internal notes, changing status/priority/assignee) are automatically attributed to the selected agent in the activity history.

### 4. Built-in `node:sqlite` Choice
- **Decision**: Utilizes Node.js's built-in `node:sqlite` (`DatabaseSync`) with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and synchronous transactions.
- **Rationale**: Avoids native binary compilation failures common with third-party drivers on newer Node versions (e.g. Node 24 on Windows lacking Visual C++ build tools), while offering identical performance and full ACID transaction guarantees.

---

## What Works, What's Incomplete & Known Issues

### ✅ What Works
- **Complete Ticket Management**: Creation, viewing, filtering, search, and editing.
- **Conversations & Distinction**: Public customer replies styled as standard bubbles; internal notes styled with a pale yellow background, dashed border, and a lock indicator.
- **Instant Dropdown Updates**: Toggling Status, Priority, or Assignee dropdowns on the detail view PATCHes immediately with an inline spinner, logging the active agent in history.
- **Quick-Action "Mark Resolved"**: 1-click button to resolve a ticket or reopen a resolved issue.
- **Transactional Audit History**: Every change to status, priority, assignee, or new note/reply is logged atomically with readable English descriptions.
- **Service Performance Dashboard**: Real-time KPI counts computed directly from SQLite data; 1-click links to pre-filtered queues for Urgent and Overdue tickets.
- **Validation**: Rejection of missing fields and whitespace-only inputs on both client and server.
- **Responsive Layout**: Designed and tested for laptop viewports (1366px width) with word-break wrapping for long strings.
- **Automated Test Suite**: 18 integration tests in Vitest covering all core business rules.

### ⏳ What's Incomplete (Optional Stretch Goals from Brief)
- **Role-Based Permissions (RBAC)**: While agents have roles (`agent`, `lead`), strict permission checks (e.g. only Admins can reassign tickets) are not enforced.
- **Password-Based Authentication**: Demo agents switch via a header selector instead of a JWT/session login wall.
- **Configurable SLA Countdown Timers**: Overdue threshold is currently hardcoded to the required 24 hours rather than being user-configurable per priority.
- **Pagination for Conversation Thread**: While the main ticket table is paginated, message threads display all messages in chronological order without pagination.

### ⚠️ Known Issues
- **Single-Node Local Storage**: SQLite is embedded locally in `server/support_desk.db`. It is ideal for local, single-instance deployments, but not distributed multi-server clusters.
- **No Real-Time Push**: Updates rely on HTTP requests and re-fetching on page mount rather than WebSockets or Server-Sent Events (SSE).

---

## How AI Tools Were Used

AI tools (Antigravity with Gemini 3.8) were utilized as an intelligent pair programmer throughout the development process:
1. **Scaffolding & Architecture**: Bootstrapping folder structures, configuring Vite proxying, and drafting initial boilerplate schemas.
2. **Implementation**: Writing Express route controllers, SQLite queries, business rule helpers, and React UI components.
3. **Automated Testing**: Authoring Vitest test suites simulating edge cases (whitespace rejection, overdue calculation, event tracking).

**Human Review & Ownership**:
Every line of generated code, SQL schema constraint, CSS rule, and business logic condition was reviewed, tested, and manually verified. Tests were executed against an actual SQLite instance, and all edge cases were verified in the browser.
