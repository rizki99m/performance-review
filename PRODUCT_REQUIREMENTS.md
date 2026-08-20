# PRODUCT_REQUIREMENTS.md

# Performance Review System — V1

## 1. Product Overview

The system is a focused Performance Review application used by HR/Admin and employees.

HR/Admin controls:

- user accounts
- performance review setup
- review participants
- reviewer relationships
- review questions
- review templates
- review schedule (Start Date and Due Date)
- review monitoring

Users can:

- login
- logout
- view assigned reviews
- fill reviews
- save drafts
- continue drafts
- submit completed reviews
- edit submitted reviews before the exclusive Due Date while the review is `IN_PROGRESS`
- view reviews about themselves after the Performance Review is closed

The system is intentionally limited to Performance Review functionality for V1.

---

## 2. System Roles

There are only two system roles.

### ADMIN

Admin represents HR.

Admin has access to administrative features and all review data.

Admin accounts may also participate as Reviewers and Reviewees. They receive the same **My Reviews** and **Reviews About Me** capabilities as normal Users while retaining administrative access.

### USER

A normal employee account.

A User does not have account-management or HR configuration privileges.

---

## 3. User Management

Admin has a dedicated **Users** page.

The page displays all users in the system.

Recommended columns:

- Name
- Position
- Username
- Status
- Actions

Admin can search and manage users from this page.

### User Fields

Each user has:

- Name
- Position / Job Title
- Username
- Password
- Role
- Status

Role values:

- `ADMIN`
- `USER`

Status values:

- `ACTIVE`
- `INACTIVE`

### Admin User Capabilities

Admin can:

- create users
- view users
- edit users
- change name
- change position/job title
- change username
- reset/change password
- activate user
- deactivate user

### User Account Capabilities

A normal User can only:

- login
- logout

Users cannot edit:

- name
- position
- username
- password
- status
- role

### Historical Data Rule

A user who has been involved in a review must not be permanently deleted.

Use `INACTIVE` instead.

Historical reviews must remain intact and readable.

---

## 4. Performance Review

Admin creates and manages Performance Reviews.

Admin may permanently delete a Performance Review. Deletion is an Admin-only destructive action, requires explicit confirmation, and removes its assignments, answers, and question snapshot atomically.

After deletion succeeds, the Performance Review must no longer be visible to any reviewer, reviewee, Admin dashboard/list, My Reviews, Reviews About Me, or Review Results. No relationship assignment or answer belonging to that Performance Review may remain.

Review creation is atomic. The Performance Review, copied question snapshots, self assignments, and all reciprocal hierarchy assignments must either all be created successfully or none may persist.

Each Performance Review contains:

- Title
- Description
- Start Date
- End Date / Due Date
- Status (system-managed)

### Performance Review Status

The available statuses are:

- `OPEN`
- `IN_PROGRESS`
- `CLOSED`

Status is derived automatically from the Performance Review schedule using PostgreSQL database time. Admin does not manually select or force a Performance Review status.

### Status Meaning

#### OPEN

`database_time < start_at`

The Performance Review has been created but the review period has not started yet. Users may be able to see that the review exists, but cannot fill it before the Start Date.

#### IN_PROGRESS

`start_at <= database_time < end_at`

The review period is active.

During this period, assigned Users can:

- start reviews
- fill answers
- save drafts
- continue drafts
- submit
- edit previously submitted reviews

#### CLOSED

`database_time >= end_at`

The review period has ended automatically according to PostgreSQL database time. Admin does not manually force-close the Performance Review.

All review answers become read-only.

Users who were reviewed may now see submitted reviews about themselves.

---

## 5. Start Date and Due Date

Only Admin can configure:

- Start Date (`start_at`)
- End Date / Due Date (`end_at`)

`start_at` and `end_at` are absolute timestamps stored as PostgreSQL `TIMESTAMPTZ`. PostgreSQL database time is the source of truth for schedule/status and edit eligibility.

A review is editable only when the backend/database verifies:

```text
start_at <= database_time < end_at
```

Boundary behavior is mandatory:

- before `start_at` -> not editable
- exactly at `start_at` -> editable
- before `end_at` -> editable
- exactly at `end_at` -> not editable
- after `end_at` -> not editable

The backend/server must enforce these rules using PostgreSQL time such as `statement_timestamp()` or `CURRENT_TIMESTAMP`. Do not rely only on disabled buttons, `Date.now()`, `new Date()`, or the user's device clock. Changing the browser/device clock must never allow early access or late submission.

### Database Status Synchronization

The Neon database already contains:

- `public.sync_performance_review_statuses()`
- `public.set_performance_review_status_from_schedule()`
- trigger `trg_performance_review_status_from_schedule` on `performance_reviews` schedule changes

The trigger recalculates status when a Performance Review is inserted or when `start_at` / `end_at` changes. The sync function updates physical status values when the database receives traffic again.

Neon may scale to zero while idle, so the system must not depend on a continuously running scheduler. `pg_cron`, a database background scheduler, WebSocket, SSE, or `LISTEN/NOTIFY` are not required for this lifecycle.

For relevant Performance Review reads, the backend should:

1. call `public.sync_performance_review_statuses()`
2. read the Performance Review
3. return an effective status calculated using PostgreSQL database time

Equivalent effective-status rule:

```sql
CASE
    WHEN statement_timestamp() >= end_at THEN 'CLOSED'
    WHEN statement_timestamp() >= start_at THEN 'IN_PROGRESS'
    ELSE 'OPEN'
END
```

Save, submit, finalize, and other editable-only operations must validate the active time window directly in SQL instead of relying only on the physical `status` column.

### Due Date Changes

Admin may extend or shorten the Due Date.

Example:

Original Due Date:

`31 August 2026, 17:00 WIB`

Updated Due Date:

`5 September 2026, 17:00 WIB`

After a successful schedule update, the application refetches the Performance Review and uses the status returned by the backend/database. If a previously closed review is rescheduled so that the current database time is inside the new window, the database trigger may return it to `IN_PROGRESS`.

### Timezone and Date/Time Display

All user-facing Performance Review dates must display **date + time + timezone** according to the browser's IANA timezone. The same absolute timestamp may therefore display differently in Jakarta, Makassar, or Jayapura while representing the same instant.

Use native timezone support such as `Intl.DateTimeFormat().resolvedOptions().timeZone`. Do not hardcode `UTC+7`, `UTC+8`, `UTC+9`, or manually add/subtract hours.

When Admin uses a local `datetime-local` field, the frontend must convert the selected local wall-clock time to an unambiguous absolute ISO timestamp before sending it to the backend.

### Frontend Status Refresh

While the application is open, relevant Performance Review data should be refetched approximately every 10 seconds so status changes appear without F5/full-page reload. Also refetch when the window regains focus or the browser tab becomes visible again. Intervals and event listeners must be cleaned up when no longer needed.

The review questionnaire screen must clearly show both **Start Date** and **Due Date**, including their time and timezone. Dashboard, Performance Review list, My Reviews, and Review Result date displays must also include time and timezone.

---

## 6. Performance Review Participants

Admin decides which users are being reviewed.

A user being reviewed is referred to as the **Reviewee**.

For each Reviewee, the system creates or provides a self-review assignment.

### Self Review

The Reviewee reviews themselves.

Relationship:

`SELF`

The self-review relationship does not need to be manually selected by HR for every user if the system can generate it automatically.

---

## 7. Reviewer Assignment

Admin configures a User's hierarchy by selecting that User's Manager, Peers, and Subordinates.

Participant and hierarchy selectors must support searchable user selection and exclude users that have already been selected. Related hierarchy users do not need to be selected as self-review participants.

Each hierarchy connection generates reciprocal review assignments. The stored relationship describes the Reviewee's position relative to the Reviewer and determines which question template the Reviewer receives.

Supported relationship types:

- `SELF`
- `MANAGER`
- `PEER`
- `SUBORDINATE`

These are **review relationships**, not account roles.

Example:

| Reviewer | Reviewee | Relationship |
|---|---|---|
| Andi | Andi | SELF |
| Andi | Budi (Andi's manager) | MANAGER |
| Budi | Andi (Budi's subordinate) | SUBORDINATE |
| Andi | Caca (Andi's peer) | PEER |
| Caca | Andi (Caca's peer) | PEER |
| Andi | Deni (Andi's subordinate) | SUBORDINATE |
| Deni | Andi (Deni's manager) | MANAGER |

The same User can have different relationships in different review assignments.

Example:

- Budi can be `MANAGER` of Andi
- Budi can be `PEER` of Caca
- Budi can be `SUBORDINATE` of another user

### Relationship History

The relationship must be stored as part of the review assignment.

It acts as a historical snapshot.

Changing a person's job or organizational relationship later must not alter old review records.

### Duplicate Assignment Rule

The same Reviewer must not be assigned more than once to the same Reviewee within the same Performance Review.

---

## 8. Review Assignment Status

Each individual review assignment has its own status.

Available statuses:

- `NOT_STARTED`
- `DRAFT`
- `SUBMITTED`

This is separate from the overall Performance Review status.

### NOT_STARTED

The Reviewer has not begun answering.

### DRAFT

The Reviewer has started answering but has not submitted the review.

Drafts may be incomplete.

### SUBMITTED

The Reviewer has completed and submitted the review.

A submitted review may still be edited only while PostgreSQL database time is inside the active Performance Review window (`start_at <= database_time < end_at`).

Submitting does not permanently lock the answers.

---

## 9. Save Draft

Users must be able to save incomplete work.

A draft may contain:

- partially completed ratings
- partially completed essays
- unanswered questions

Users can leave the page and continue later.

The system should preserve all saved answers.

A visible `Save Draft` action is required.

Autosave may also be implemented, but it does not replace the explicit draft behavior.

---

## 10. Submit Validation

A User may submit a review only when **all questions have been answered** and PostgreSQL database time is still inside the active Performance Review window (`start_at <= database_time < end_at`).

Draft:

- incomplete answers are allowed

Submit:

- incomplete answers are not allowed

If one or more questions are unanswered, submission must be blocked and the User should be shown which questions still require answers.

For V1, all review questions are required.

---

## 11. Editing Submitted Reviews

A submitted review remains editable only while PostgreSQL database time is before the exclusive Due Date (`end_at`) and on/after `start_at`.

Example:

Performance Review Due Date:

`31 August 2026, 17:00 WIB`

User submits:

`20 August 2026, 10:00 WIB`

The User may continue to:

- view the submitted answers
- edit answers
- save changes

until the review period ends.

The assignment may remain `SUBMITTED` while edits are made.

It does not need to return to `DRAFT`.

At exactly the Due Date (`database_time == end_at`) and afterward, the review becomes read-only.

---

## 12. Reviews About Me

Users have a page/section for reviews about themselves.

A Reviewee must **not** see incoming review results while the Performance Review is still open or in progress.

Review results become visible to the Reviewee only when the Performance Review status is:

`CLOSED`

After closure:

- the Reviewee can view reviews about themselves
- the Reviewee cannot edit those reviews

The Reviewer also cannot edit after closure.

Admin can view all reviews.

Reviewer identity remains visible to Admin for operational administration, but generated employee result reports must remain anonymous.

---

## 13. Question Templates

Admin manages reusable question templates.

Templates are separated by review relationship.

Required template categories:

- Self Review Template
- Manager Review Template
- Peer Review Template
- Subordinate Review Template

Relationship mapping:

- Reviewer reviewing themselves uses `SELF`.
- Reviewer reviewing their manager uses `MANAGER`.
- Reviewer reviewing their peer uses `PEER`.
- Reviewer reviewing their subordinate uses `SUBORDINATE`.

Templates are starting points for Performance Reviews.

They are not permanent live references.

Deleting a Question Template item removes it only from the reusable template. It must not remove or alter a question snapshot already copied into an existing Performance Review. The snapshot's optional source-template reference may be cleared safely.

---

## 14. Performance Review Questions

When creating a Performance Review, Admin can load questions from the relevant templates.

The questions used in a Performance Review become a **snapshot** for that review.

Changing the template later must not modify questions in an existing Performance Review.

For each relationship type, Admin can:

- add questions
- edit questions
- delete questions
- reorder questions

Example sections:

- Self questions
- Manager questions
- Peer questions
- Subordinate questions

### Question Locking

Before the Performance Review starts, Admin may freely modify the review questions.

Once the Performance Review is `IN_PROGRESS`, the question structure is locked.

Admin should not:

- add questions
- delete questions
- change question type
- reorder questions
- materially edit questions

This protects review answers and historical consistency.

When `CLOSED`, questions remain read-only.

---

## 15. Question Types

V1 supports exactly two question types.

### Rating 1–5

Type:

`RATING_1_5`

Allowed values:

- 1
- 2
- 3
- 4
- 5

Recommended display:

- 1 = Very Poor / Strongly Negative
- 2 = Poor
- 3 = Adequate
- 4 = Good
- 5 = Very Good / Strongly Positive

Exact UI wording may follow the company's preferred language.

The numeric scale itself is fixed at 1–5 for V1.

### Essay

Type:

`ESSAY`

The User provides a free-text answer.

---

## 16. Admin Navigation

The initial Admin navigation should remain focused.

Recommended items:

- Dashboard
- Users
- Performance Reviews
- Question Templates
- My Reviews
- Reviews About Me
- Review Results
- Logout

### Dashboard

Admin Dashboard may show high-level review monitoring such as:

- active Performance Reviews
- number of assigned reviews
- not started
- drafts
- submitted
- completion progress

Avoid advanced analytics in V1.

Admin Dashboard contains two distinct lists:

- **Review Sedang Berjalan**: `IN_PROGRESS` Performance Reviews; opening an item leads to review configuration/editing.
- **Review yang Perlu Dikerjakan**: the Admin's own `OPEN` or `IN_PROGRESS` assignments that are not yet submitted; opening an item leads to the questionnaire. `CLOSED` assignments never appear in this dashboard list.

### Review Results

Admin can select a Performance Review and Reviewee to open a consolidated, print-ready report. The report groups submitted feedback by source relationship without reviewer names and supports browser-based PDF export.

The printed/PDF report must hide application navigation and interactive controls, including the mobile header and Menu button. Browser-generated headers/footers (such as URL or page time) are controlled by the browser print-dialog setting, not by the application.

---

## 17. User Navigation

Recommended User navigation:

- Dashboard
- My Reviews / Reviews To Complete
- Reviews About Me
- Logout

### My Reviews

Shows review assignments where the User is the Reviewer.

Possible actions:

- Start
- Continue
- View
- Edit
- Submit

Actions depend on:

- assignment status
- effective Performance Review status returned by the backend
- the active schedule validated using PostgreSQL database time
- the Start Date and exclusive Due Date

Dashboard work lists may show an `OPEN` assignment as notice, but it remains non-editable until `IN_PROGRESS`.

### Reviews About Me

Shows reviews where the User is the Reviewee.

Results are only visible after the Performance Review is `CLOSED`.

Before closure, a Reviewee may be shown that they will receive feedback grouped by anonymous relationship label, but cannot see answers or reviewer identity. After closure, every incoming assignment must be shown. A submitted assignment displays its answers; an unsubmitted assignment displays a clear statement that the feedback was not filled in. Draft answers remain confidential.

---

## 18. Authorization Summary

### ADMIN

Admin can:

- login/logout
- view dashboard
- create/edit/manage users
- activate/deactivate users
- reset user passwords
- create/edit Performance Reviews
- set Start Date and Due Date
- view system-managed Performance Review status (not manually override it)
- choose Reviewees
- assign Reviewers
- assign reviewer relationships
- manage question templates
- customize review questions before start
- view all reviews
- monitor completion
- manage review configuration
- participate as a Reviewer or Reviewee
- view anonymized per-employee result reports
- export a print-ready result report to PDF

### USER

User can:

- login/logout
- view assigned reviews
- fill assigned reviews
- save drafts
- continue drafts
- submit completed reviews
- edit submitted reviews before the exclusive Due Date while the review is `IN_PROGRESS`
- view own incoming review results after Performance Review is closed

Reviewer identities are confidential in employee-facing results. Results use relationship labels such as `Manager`, `Peer 1`, `Peer 2`, or `Subordinate 1` instead of names. The same anonymity applies to exported reports.

User cannot:

- manage users
- change their own profile/account data
- configure Performance Reviews
- configure templates
- configure reviewer assignments
- edit reviews written by another person

### Operation Feedback

Create, edit, question reorder, save draft, submit, and delete operations use application-styled dialogs/popups rather than native browser dialogs. On success, show `Data Berhasil Di Simpan` (or equivalent action-specific acknowledgement) and only then navigate away when applicable. On failure, show a human-readable failure message and remain on the current page.

---

## 19. V1 Scope Exclusions

The following are intentionally excluded from V1 unless explicitly requested later:

- configurable anonymity rules
- development plans
- goal tracking
- email reminders
- push notifications
- advanced analytics
- calibration
- weighted scoring
- configurable rating scales
- Excel export
- organizational department management
- automatic organization hierarchy
- HRIS integration
- employee profile self-service
- employee password self-service
- external/client reviewers

---

## 20. Core V1 Flow

```text
ADMIN
  |
  +-- Create / Manage Users
  |
  +-- Create Performance Review
        |
        +-- Set Title & Description
        +-- Set Start Date & Due Date
        +-- Select Reviewees
        +-- SELF assignment
        +-- Assign MANAGER / PEER / SUBORDINATE reviewers
        +-- Load Question Templates
        +-- Customize Questions
        |
        +-- OPEN (DB time < Start Date)
              |
              v
        IN_PROGRESS (Start Date <= DB time < Due Date)
              |
              v
          USER REVIEWS
              |
        +-----+------------------+
        |                        |
     Save Draft               Complete
        |                        |
     Continue                 Submit
                                 |
                                 +-- Editable while DB time < Due Date
                                 |
                                 v
                              CLOSED (DB time >= Due Date)
                                 |
                    +------------+-------------+
                    |                          |
             All answers locked       Reviewee can view
```

This document represents the locked V1 product scope.
