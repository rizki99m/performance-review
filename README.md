# DOKI Performance Review

DOKI Performance Review is a focused employee performance review web application for HR teams and employees. It supports relationship-based feedback between employees, managers, peers, and subordinates while preserving historical review questions and answers.

The application is built as an independent product with DOKI branding and uses authenticated server APIs backed by Neon PostgreSQL.

## Key features

- Secure username and password authentication with HTTP-only cookie sessions
- Server-side authorization for `ADMIN` and `USER` accounts
- User management with active and inactive account states
- Performance Review cycles with precise Start Date and Due Date timestamps
- Database-authoritative `OPEN` -> `IN_PROGRESS` -> `CLOSED` status derived from PostgreSQL time
- Neon Scale-to-Zero-safe status synchronization when the application reads Performance Review data
- Self-review assignments generated automatically for selected participants
- Reciprocal hierarchy assignments for managers, peers, and subordinates
- Searchable participant and hierarchy pickers designed for large user lists
- Relationship-specific question templates: Self, Manager, Peer, and Subordinate
- Explicit Up/Down question ordering
- Rating 1–5 and essay questions
- Draft saving, required-answer validation, submission, and server-side Due Date enforcement using PostgreSQL database time
- Exclusive Due Date boundary: review activity is allowed only while `start_at <= database_time < end_at`
- Automatic status/data refetch about every 10 seconds plus window-focus/tab-visibility refresh, without full-page reloads
- Browser-local date/time display using IANA timezone support; schedule text includes date, time, and timezone
- Review questionnaire schedule panel showing Start Date and Due Date with time/timezone
- Admin monitoring for assignment progress and review status
- Anonymous employee-facing feedback grouped as Manager, Peer 1, Peer 2, Subordinate 1, and similar labels
- Consolidated Admin result reports with print-ready PDF export
- Responsive desktop and mobile layouts with collapsible navigation
- Shared in-app confirmation and success/failure popups; no native browser dialogs
- Dashboard work lists limited to `OPEN` and `IN_PROGRESS` assignments
- Closed results retain anonymous relationship entries even when a reviewer did not submit feedback

## Review relationship model

Hierarchy connections create review assignments in both directions. The question template is selected from the perspective of the person completing the review.

For example, if Budi is Andi's manager:

| Reviewer | Person being reviewed | Question template |
| -------- | --------------------- | ----------------- |
| Andi     | Budi                  | Manager           |
| Budi     | Andi                  | Subordinate       |

Peer relationships use the Peer template in both directions. Every selected participant also receives a Self assignment.

## Roles

### Admin

Admins can manage users, Performance Reviews, hierarchy assignments, question templates, Start/Due Date schedules, and consolidated results. Performance Review status is system-managed from the schedule and is displayed to Admin as read-only. Admin accounts can also participate as reviewers and reviewees.

### User

Users can complete assigned reviews, save drafts, submit answers, edit submitted answers while the Performance Review is `IN_PROGRESS` and before the exclusive Due Date, and view anonymous feedback about themselves after a review is closed.

## Data lifecycle

Deleting a Performance Review is Admin-only and atomically removes its assignments, answers, and question snapshots, so it disappears for every related account. Deleting a reusable template question does not alter existing review snapshots; only its optional source reference is cleared. This preserves completed and in-progress review history.


## Time, status, and timezone model

PostgreSQL database time is the source of truth for Performance Review status and edit eligibility:

```text
database_time < start_at             -> OPEN
start_at <= database_time < end_at   -> IN_PROGRESS
database_time >= end_at              -> CLOSED
```

The Neon database uses `TIMESTAMPTZ` schedule values and existing status synchronization/trigger logic. The application does not use the browser/device clock to authorize early access, saving, or submission. At exactly `end_at`, the review is no longer editable.

Neon may scale to zero while idle. Relevant reads wake/synchronize status and return a database-time effective status, so no `pg_cron` or continuously running database scheduler is required.

User-facing dates are rendered in the browser's resolved IANA timezone and include date, time, and timezone. Admin `datetime-local` values are converted to absolute timestamps before being sent to the backend.

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Neon PostgreSQL
- `@neondatabase/serverless`
- `bcryptjs`
- pnpm
