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
| -------- | --------------------- | ----------------- |
| Andi     | Budi                  | Manager           |
| Budi     | Andi                  | Subordinate       |

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
