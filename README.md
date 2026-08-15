# DOKI Performance Review

DOKI Performance Review is a focused employee performance review web application for HR teams and employees. It supports relationship-based feedback between employees, managers, peers, and subordinates while preserving historical review questions and answers.

The application is built as an independent product with DOKI branding and uses authenticated server APIs backed by Neon PostgreSQL.

## Key features

- Secure username and password authentication with HTTP-only cookie sessions
- Server-side authorization for `ADMIN` and `USER` accounts
- User management with active and inactive account states
- Performance Review cycles with precise start and end date/time
- Self-review assignments generated automatically for selected participants
- Reciprocal hierarchy assignments for managers, peers, and subordinates
- Searchable participant and hierarchy pickers designed for large user lists
- Relationship-specific question templates: Self, Manager, Peer, and Subordinate
- Drag-and-drop question ordering
- Rating 1–5 and essay questions
- Draft saving, required-answer validation, submission, and deadline enforcement
- Admin monitoring for assignment progress and review status
- Anonymous employee-facing feedback grouped as Manager, Peer 1, Peer 2, Subordinate 1, and similar labels
- Consolidated Admin result reports with print-ready PDF export
- Responsive desktop and mobile layouts with collapsible navigation

## Review relationship model

Hierarchy connections create review assignments in both directions. The question template is selected from the perspective of the person completing the review.

For example, if Budi is Andi's manager:

| Reviewer | Person being reviewed | Question template |
|---|---|---|
| Andi | Budi | Manager |
| Budi | Andi | Subordinate |

Peer relationships use the Peer template in both directions. Every selected participant also receives a Self assignment.

## Roles

### Admin

Admins can manage users, Performance Reviews, hierarchy assignments, question templates, deadlines, statuses, and consolidated results. Admin accounts can also participate as reviewers and reviewees.

### User

Users can complete assigned reviews, save drafts, submit answers, edit submitted answers until the deadline, and view anonymous feedback about themselves after a review is closed.

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Neon PostgreSQL
- `@neondatabase/serverless`
- `bcryptjs`
- pnpm

## Local setup

### Prerequisites

- Node.js 20 or newer
- pnpm
- A Neon PostgreSQL database

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the environment

Copy the example environment file:

```powershell
Copy-Item .env.example .env.local
```

For macOS or Linux:

```bash
cp .env.example .env.local
```

Set the Neon connection string in `.env.local`:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Never commit `.env.local` or real database credentials.

### 3. Initialize the database

Run [`database/schema.sql`](database/schema.sql) against an empty Neon database. This file is the authoritative database contract and creates the tables, constraints, indexes, triggers, views, default question templates, and supporting functions required by the application.

Create the first Admin account directly in PostgreSQL using a bcrypt password hash. After logging in, additional users can be managed from the **Users** page.

### 4. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available commands

```bash
pnpm dev            # Start the development server
pnpm lint           # Run ESLint
pnpm exec tsc --noEmit
pnpm build          # Create a production build
pnpm start          # Run the production server
```

## Data and security notes

- Database credentials are used only by server-side code.
- Protected routes redirect unauthenticated visitors to `/login`.
- Authorization and review deadlines are enforced by backend APIs, not only by disabled UI controls.
- Question templates are copied into each Performance Review as snapshots so later template edits do not alter historical reviews.
- Employee-facing results do not expose reviewer names or reviewer IDs.
- Performance Review deletion is restricted to Admin accounts and removes related data atomically.
- There is no browser mock-data fallback; database connection errors are shown explicitly.

## Product documentation

- [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md) — product behavior and V1 scope
- [`DESIGN_REQUIREMENTS.md`](DESIGN_REQUIREMENTS.md) — visual and interaction requirements
- [`AGENTS.md`](AGENTS.md) — repository rules for coding agents and contributors
- [`database/schema.sql`](database/schema.sql) — PostgreSQL schema and database rules

## Current scope

This repository targets a focused Performance Review V1. Features such as development plans, reminders, weighted scoring, configurable rating scales, Excel export, HRIS integration, and employee profile self-service are intentionally outside the current scope.
