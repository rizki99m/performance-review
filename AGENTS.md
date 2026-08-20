# AGENTS.md

## Project Context

This repository is a standalone **Performance Review System**.

The application is a new project with its own domain, database, routes, and business logic.

A separate existing local project named `candidate-tracker` is used only as a **visual and design reference**.

Reference project path:

`D:\Projects\candidate-tracker`

## Mandatory Reading

Before making any implementation changes, read:

1. `PRODUCT_REQUIREMENTS.md`
2. `DESIGN_REQUIREMENTS.md`

Treat both documents as the source of truth for this project.

If a task conflicts with either document, follow the latest explicit user instruction and update the relevant requirement document when appropriate.

## Repository Boundaries

The `candidate-tracker` project is **READ-ONLY**.

You may inspect files from `candidate-tracker` to understand:

- visual language
- layout
- navigation
- typography
- spacing
- color palette
- forms
- buttons
- tables
- dialogs/modals
- login page
- reusable UI patterns
- company branding
- company logo and visual assets

Do not modify any file inside `candidate-tracker`.

All code changes must be written only inside this Performance Review project.

## Design Reuse Rules

The new Performance Review application should feel like a product from the same company and design family as `candidate-tracker`.

You may adapt reusable UI concepts or components from the reference project, but do not carry over recruitment-specific business logic.

Do not copy or introduce old domain entities such as:

- Candidate
- Hire Request
- Role Request
- recruitment workflow
- recruitment database schema
- recruitment APIs
- recruitment-specific permissions

The Performance Review application must remain functionally independent.

## Asset Rules

Company branding and logo from the reference project may be reused.

If an asset is needed by the new application, copy it into this project's own `public` or equivalent asset directory.

Do not make the new application depend on runtime asset paths inside `candidate-tracker`.

## Implementation Principles

- Keep the system simple and aligned with the locked V1 scope.
- Do not introduce features that are not required.
- Avoid over-engineering.
- Keep authorization checks on the server/backend, not only in the UI.
- Preserve historical review data.
- Prefer clear relational data structures over unnecessary abstractions.
- Use the current project's existing stack and conventions unless explicitly instructed otherwise.
- Build reusable UI where it meaningfully reduces duplication.
- Keep Admin/HR behavior separate from User behavior.
- Treat PostgreSQL database time as the authoritative clock for Performance Review schedule, status, deadline eligibility, and authorization.
- Never use the browser/device clock (`Date.now()`, `new Date()`, or manually adjusted offsets) as the business-rule authority for whether a review has started, is editable, can be saved/submitted, or is closed.
- Performance Review status is system-managed from `start_at` and `end_at`; Admin/UI must not manually set `OPEN`, `IN_PROGRESS`, or `CLOSED`.
- Treat `end_at` as exclusive for review activity: `start_at <= database_time < end_at`. At exactly `end_at`, save/submit/edit operations must be rejected.
- Keep `start_at` and `end_at` as absolute `TIMESTAMPTZ` values. Display dates/times in the browser's IANA timezone and include both time and timezone in user-facing schedule/deadline text.
- Use lightweight page-level refetching for status freshness (approximately every 10 seconds, plus browser focus/visibility refresh) instead of full-page reloads or new realtime infrastructure.

## Before Coding

For any meaningful feature:

1. Read the relevant sections of `PRODUCT_REQUIREMENTS.md`.
2. Inspect the equivalent visual patterns in `candidate-tracker` when applicable.
3. Follow `DESIGN_REQUIREMENTS.md`.
4. Implement only the requested scope.
5. Verify that permissions and deadline rules are enforced correctly using PostgreSQL database time, not browser/device time.

## Product Roles

There are only two system roles:

- `ADMIN`
- `USER`

`SELF`, `MANAGER`, `PEER`, and `SUBORDINATE` are review relationships, not system roles.

## Scope Guard

Do not add the following unless explicitly requested in the future:

- development plans
- email reminders
- advanced analytics
- Excel export
- department management
- employee self-service profile editing
- user password change by the user
- notifications
- weighted scoring
- configurable rating scales
- HRIS features outside Performance Review

The current target is a focused, reliable Performance Review V1.

Reviewer identity confidentiality and print-ready PDF result export are part of the current requested V1 scope. Employee-facing and exported results must identify sources only by relationship and sequence, such as `Manager`, `Peer 1`, or `Subordinate 2`.

Admin accounts may participate as Reviewers and Reviewees while retaining administrative capabilities.

- Use application-styled dialogs and acknowledgement popups; never use native browser `alert`, `confirm`, or `prompt`.
- Successful create, edit, reorder, draft-save, submit, and delete operations must show an explicit success acknowledgement before navigation changes. Failed operations must keep the current page open and show a safe failure acknowledgement.
- Deleting a Performance Review must atomically remove its answers, assignments, and question snapshots so it disappears for every related account. Deleting a template question must preserve existing review snapshots.
- Reviews About Me reveals relationship groups and results only after closure; show unanswered assignments as unfilled without revealing drafts or reviewer identity.
- Dashboard work lists include `OPEN` and `IN_PROGRESS` assignments only; never `CLOSED` items.

## Database Source of Truth

Before making any database-related implementation changes, always read:

- `database/schema.sql`

The SQL file is the authoritative database contract and should document the database functions/triggers already deployed in Neon.

Do not invent, rename, or alter database tables, columns, types, constraints,
relationships, functions, triggers, or views unless explicitly instructed.

Frontend/server TypeScript models must adapt to the PostgreSQL schema,
not the other way around.

The actual Neon connection string must only come from:

`DATABASE_URL`

stored in `.env.local`.

Never commit `.env.local` or any real database credentials.

### Performance Review Time and Status Rules

The deployed Neon database already owns the schedule/status lifecycle. Preserve these rules unless explicitly instructed otherwise:

- `database_time < start_at` -> `OPEN`
- `start_at <= database_time < end_at` -> `IN_PROGRESS`
- `database_time >= end_at` -> `CLOSED`
- `closed_at = end_at` when closed; otherwise `closed_at = NULL`
- `public.sync_performance_review_statuses()` synchronizes the physical `performance_reviews.status` value using PostgreSQL time.
- `public.set_performance_review_status_from_schedule()` and trigger `trg_performance_review_status_from_schedule` recalculate status when `start_at` or `end_at` changes.
- Neon may scale to zero when idle. Do not add `pg_cron` or a database background scheduler for status changes. On relevant Performance Review reads, wake/sync the database and return an effective status calculated with PostgreSQL time.
- Save, submit, finalize, or other editable-only operations must validate the active schedule directly in SQL using PostgreSQL time. Do not rely only on the stored physical status.
- When an Admin changes the schedule, refetch the Performance Review and trust the status returned by the backend/database trigger.

### Frontend Date/Time and Refresh Rules

- `datetime-local` inputs represent the Admin's local wall-clock time; convert them to an unambiguous absolute ISO timestamp before sending to the backend.
- User-facing Start Date, Due Date, schedule, and result timestamps must display date, time, and the browser-resolved timezone.
- Use `Intl.DateTimeFormat().resolvedOptions().timeZone` / native IANA timezone support. Do not hardcode `UTC+7`, `UTC+8`, `UTC+9`, or manually add hours.
- The review questionnaire screen must visibly show Start Date and Due Date with time/timezone.
- The frontend should refetch relevant Performance Review data about every 10 seconds while the app is open and also when the tab/window becomes active again. Clean up intervals/listeners on unmount.
- Polling must be owned by the page/application data layer, not by every small child component.
- When a database trigger/function changes in `database/schema.sql`, apply the compatible change to the authorized Neon development database and record the deployment in test/report documentation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
