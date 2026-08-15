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

## Before Coding

For any meaningful feature:

1. Read the relevant sections of `PRODUCT_REQUIREMENTS.md`.
2. Inspect the equivalent visual patterns in `candidate-tracker` when applicable.
3. Follow `DESIGN_REQUIREMENTS.md`.
4. Implement only the requested scope.
5. Verify that permissions and deadline rules are enforced correctly.

## Product Roles

There are only two system roles:

- `ADMIN`
- `USER`

`SELF`, `MANAGER`, `PEER`, and `SUBORDINATE` are review relationships, not system roles.

## Scope Guard

Do not add the following unless explicitly requested in the future:

- anonymous reviews
- development plans
- email reminders
- advanced analytics
- PDF export
- Excel export
- department management
- employee self-service profile editing
- user password change by the user
- notifications
- weighted scoring
- configurable rating scales
- HRIS features outside Performance Review

The current target is a focused, reliable Performance Review V1.

## Database Source of Truth

Before making any database-related implementation changes, always read:

- `database/schema.sql`

The SQL file is the authoritative database contract.

Do not invent, rename, or alter database tables, columns, types, constraints,
relationships, functions, triggers, or views unless explicitly instructed.

Frontend/server TypeScript models must adapt to the PostgreSQL schema,
not the other way around.

The actual Neon connection string must only come from:

`DATABASE_URL`

stored in `.env.local`.

Never commit `.env.local` or any real database credentials.
