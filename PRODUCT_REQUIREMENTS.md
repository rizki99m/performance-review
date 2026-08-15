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
- review deadlines
- review status
- review monitoring

Users can:

- login
- logout
- view assigned reviews
- fill reviews
- save drafts
- continue drafts
- submit completed reviews
- edit submitted reviews before the deadline
- view reviews about themselves after the Performance Review is closed

The system is intentionally limited to Performance Review functionality for V1.

---

## 2. System Roles

There are only two system roles.

### ADMIN

Admin represents HR.

Admin has access to administrative features and all review data.

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

Each Performance Review contains:

- Title
- Description
- Start Date
- End Date / Deadline
- Status

### Performance Review Status

The available statuses are:

- `OPEN`
- `IN_PROGRESS`
- `CLOSED`

### Status Meaning

#### OPEN

The Performance Review has been created but the review period has not started yet.

Users may be able to see that the review exists, but cannot fill it before the start date.

#### IN_PROGRESS

The review period is active.

During this period, assigned Users can:

- start reviews
- fill answers
- save drafts
- continue drafts
- submit
- edit previously submitted reviews

#### CLOSED

The review period has ended or HR/Admin has closed it.

All review answers become read-only.

Users who were reviewed may now see submitted reviews about themselves.

---

## 5. Start Date and Deadline

Only Admin can configure:

- Start Date
- End Date / Deadline

The dates control whether a review can be edited.

A review is editable only when:

- the Performance Review is not closed
- the current date/time is on or after the Start Date
- the current date/time is on or before the End Date

The backend/server must enforce these rules.

Do not rely only on disabled buttons in the frontend.

### Deadline Changes

Admin may extend or shorten the deadline.

Example:

Original deadline:

`31 August 2026`

Updated deadline:

`5 September 2026`

If the Performance Review is not force-closed, submitted reviews become editable again until the new deadline.

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

Admin determines who will review each Reviewee.

Admin also determines the relationship between Reviewer and Reviewee.

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
| Budi | Andi | MANAGER |
| Caca | Andi | PEER |
| Deni | Andi | SUBORDINATE |

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

A submitted review may still be edited while:

- the Performance Review is not closed
- the deadline has not passed

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

A User may submit a review only when **all questions have been answered**.

Draft:

- incomplete answers are allowed

Submit:

- incomplete answers are not allowed

If one or more questions are unanswered, submission must be blocked and the User should be shown which questions still require answers.

For V1, all review questions are required.

---

## 11. Editing Submitted Reviews

A submitted review remains editable until the deadline.

Example:

Performance Review deadline:

`31 August 2026`

User submits:

`20 August 2026`

The User may continue to:

- view the submitted answers
- edit answers
- save changes

until the review period ends.

The assignment may remain `SUBMITTED` while edits are made.

It does not need to return to `DRAFT`.

Once the Performance Review is closed or the deadline passes, the review becomes read-only.

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

- `SELF`
- `MANAGER`
- `PEER`
- `SUBORDINATE`

Templates are starting points for Performance Reviews.

They are not permanent live references.

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
- Performance Review status
- current date
- deadline

### Reviews About Me

Shows reviews where the User is the Reviewee.

Results are only visible after the Performance Review is `CLOSED`.

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
- set start date and deadline
- choose Reviewees
- assign Reviewers
- assign reviewer relationships
- manage question templates
- customize review questions before start
- view all reviews
- monitor completion
- manage review configuration

### USER

User can:

- login/logout
- view assigned reviews
- fill assigned reviews
- save drafts
- continue drafts
- submit completed reviews
- edit submitted reviews before deadline
- view own incoming review results after Performance Review is closed

User cannot:

- manage users
- change their own profile/account data
- configure Performance Reviews
- configure templates
- configure reviewer assignments
- edit reviews written by another person

---

## 19. V1 Scope Exclusions

The following are intentionally excluded from V1 unless explicitly requested later:

- anonymous feedback
- configurable anonymity rules
- development plans
- goal tracking
- email reminders
- push notifications
- advanced analytics
- calibration
- weighted scoring
- configurable rating scales
- PDF export
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
        +-- Set Start Date & Deadline
        +-- Select Reviewees
        +-- SELF assignment
        +-- Assign MANAGER / PEER / SUBORDINATE reviewers
        +-- Load Question Templates
        +-- Customize Questions
        |
        +-- OPEN
              |
              v
        IN_PROGRESS
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
                                 +-- Editable until deadline
                                 |
                                 v
                              CLOSED
                                 |
                    +------------+-------------+
                    |                          |
             All answers locked       Reviewee can view
```

This document represents the locked V1 product scope.
