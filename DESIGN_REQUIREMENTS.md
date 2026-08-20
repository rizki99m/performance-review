# DESIGN_REQUIREMENTS.md

# Performance Review — Design Requirements

## 1. Design Direction

The Performance Review application is a new standalone product, but it must visually feel like part of the same company product family as the existing local `candidate-tracker` project.

Reference project:

`D:\Projects\candidate-tracker`

The reference repository is a **design reference only**.

Do not copy recruitment-specific product behavior.

---

## 2. Main Design Goal

A user who has previously used Candidate Tracker should immediately recognize the Performance Review application as another product from the same company.

The experience should feel:

- familiar
- clean
- professional
- simple
- consistent
- efficient
- modern

The new application does not need to look pixel-for-pixel identical.

It should preserve the visual language while adapting layouts to Performance Review workflows.

---

## 3. Inspect the Reference Project First

Before creating new major UI patterns, inspect the local `candidate-tracker` project.

Pay particular attention to:

- application shell
- sidebar
- header/navigation
- page containers
- page titles
- typography
- spacing rhythm
- color palette
- buttons
- input fields
- selects
- forms
- tables
- badges/status labels
- cards
- dialogs/modals
- pagination
- empty states
- login page
- responsive behavior
- loading states
- company logo usage

Reuse existing patterns where they fit the new product.

Do not redesign common controls without a reason.

---

## 4. Branding

Use the same company identity used in `candidate-tracker`.

This includes:

- company logo
- core brand colors
- typography style
- overall visual tone

The company logo currently used in the reference project should also be used in the Performance Review application.

Copy the required logo asset into this project's own asset directory, for example:

`public/`

The new application must not depend on the reference project's filesystem at runtime.

---

## 5. Application Shell

The application shell should remain visually consistent with Candidate Tracker.

Where appropriate, preserve or adapt:

- sidebar dimensions
- sidebar appearance
- navigation behavior
- logo placement
- header style
- page content width
- spacing around page content
- desktop/mobile navigation behavior

The Performance Review product should have its own navigation labels.

### Admin Navigation

Recommended:

- Dashboard
- Users
- Performance Reviews
- Question Templates
- My Reviews
- Reviews About Me
- Review Results
- Logout

### User Navigation

Recommended:

- Dashboard
- My Reviews
- Reviews About Me
- Logout

Do not show Admin-only navigation to normal Users.

The desktop sidebar can collapse and expand. Both desktop and mobile sidebars must scroll independently when navigation exceeds the viewport, without making profile and logout controls unreachable.

Menu navigation participates in browser history so Back returns to the prior application menu. The mobile drawer must include an explicit close control.

---

## 6. Login Page

The login page should visually follow Candidate Tracker's login experience.

Reuse the same general:

- branding
- logo treatment
- card/container style
- field style
- button style
- spacing
- background treatment

Fields required:

- Username
- Password

No registration link is needed.

No employee self-service account creation is needed.

---

## 7. Page Structure

Use a consistent page structure.

Recommended hierarchy:

1. Page title
2. Short supporting description when needed
3. Primary action
4. Filters/search where relevant
5. Main content

Example:

```text
Users

Manage employee accounts used in Performance Review.

[ + Add User ]

[ Search users... ]

User table
```

Avoid unnecessary visual complexity. Page headers do not require gray supporting subtitles unless the content genuinely needs clarification.

---

## 8. Buttons

Follow the button patterns from Candidate Tracker.

Maintain consistency for:

- primary action
- secondary action
- destructive action
- disabled state
- loading state

Typical primary actions include:

- Add User
- Create Performance Review
- Add Reviewer
- Add Question
- Save Draft
- Submit Review

Typical secondary actions include:

- Cancel
- Edit
- Continue
- View

Destructive actions should be visually distinct and used carefully.

Do not use native browser alert or confirm dialogs. Destructive confirmation must use an application-styled modal with backdrop, clear title, consequence text, Cancel action, destructive action, and loading state.

Non-destructive confirmations, such as review submission, use the same dialog pattern with `Submit` and `Cancel` actions (never a destructive `Delete` label). Successful and failed mutations use the shared acknowledgement popup pattern; failed mutations keep the current form/page visible.

---

## 9. Status Badges

Use consistent status badges across the application.

### Performance Review Status

- OPEN
- IN_PROGRESS
- CLOSED

Performance Review status is read-only/system-managed in the UI. Admin configuration screens may display the current status badge, but must not provide a manual status selector. Status comes from the backend/database schedule calculation.

### Review Assignment Status

- NOT_STARTED
- DRAFT
- SUBMITTED

### User Status

- ACTIVE
- INACTIVE

Badge colors should follow the reference project's existing color system where possible.

Do not introduce an unrelated status color palette.

---

## 10. Tables

Tables should reuse Candidate Tracker's table patterns where practical.

Expected table use cases include:

### Users

Columns may include:

- Name
- Position
- Username
- Status
- Actions

### Performance Reviews

Columns may include:

- Title
- Schedule
  - Start Date with time and timezone
  - Due Date with time and timezone
- Status
- Progress
- Actions

### Reviewer Assignments

Columns may include:

- Reviewer
- Reviewee
- Relationship
- Status

Tables should support clear scanning.

Use search/filter controls only where they provide value.

---

## 11. Forms

Forms should follow Candidate Tracker's existing field appearance.

Use consistent:

- labels
- input heights
- border radius
- focus states
- validation messages
- spacing
- select/dropdown appearance

Do not invent a separate visual system for Performance Review forms.

### User Form

Fields:

- Name
- Position
- Username
- Password
- Role
- Status when editing

### Performance Review Form

Fields:

- Title
- Description
- Start Date & Time
- End Date / Due Date & Time

Use local `datetime-local` inputs for Admin convenience. The selected local time must be converted to an absolute timestamp before it is sent to the backend. Status is displayed separately as a read-only badge; it is not an editable form field.

---

## 12. Performance Review Setup Experience

The configuration experience should be understandable to HR without technical knowledge.

A step-based layout is acceptable.

Suggested conceptual flow:

1. Review Information
2. Participants / Reviewees
3. Reviewer Assignments
4. Questions
5. Review / Save

This does not have to be implemented as a strict wizard if a tabbed or sectioned interface fits the reference design better.

The priority is clarity.

---

## 13. Reviewer Assignment UI

For each Reviewee, HR should clearly see who is assigned to review them.

Recommended grouping:

```text
Andi

SELF
- Andi

MANAGER
- Budi

PEER
- Caca
- Deni

SUBORDINATE
- Eko
```

Provide an obvious:

`+ Add Reviewer`

action.

When adding a reviewer, HR chooses:

- User
- Relationship

Relationships:

- MANAGER
- PEER
- SUBORDINATE

SELF can be automatically generated.

Avoid making HR work with raw IDs or technical database concepts.

Participant and hierarchy selection must use a searchable popup picker rather than rendering every user or relying on a long native select. Already selected users must be excluded from subsequent search results.

---

## 14. Question Template UI

Question Templates should be easy to manage.

Recommended categories/tabs:

- Self
- Manager
- Peer
- Subordinate

Each question item should clearly show:

- question text
- question type
- order
- edit action
- delete action

Admin can:

- add
- edit
- delete
- reorder

Question ordering uses explicit `Up` and `Down` buttons. Disable `Up` for the first question and `Down` for the last question. Do not use drag-and-drop for this interaction.

---

## 15. Review Question Configuration

When configuring a specific Performance Review, the Admin should be able to start from the relevant templates.

Questions copied into the review should appear editable before the review begins.

Recommended UI:

```text
[ Self ] [ Manager ] [ Peer ] [ Subordinate ]

1. How would you rate...
   Rating 1–5
   [Edit] [Delete]

2. What was...
   Essay
   [Edit] [Delete]

[ + Add Question ]
```

Once the Performance Review is in progress, clearly indicate that questions are locked.

Example:

`Questions are locked because this Performance Review has started.`

---

## 16. Rating Question UI

Rating questions use a fixed 1–5 scale.

The control should be easy to scan and click.

Example:

```text
1      2      3      4      5
○      ○      ○      ○      ○
```

Optional supporting labels may be shown at both ends.

Example:

```text
Very Poor                         Very Good
```

Use accessible input controls.

A keyboard user must be able to select ratings.

---

## 17. Essay Question UI

Essay questions should use a comfortable multiline text area.

Provide enough space for meaningful feedback.

Do not make the field visually overwhelming.

Show validation when the User tries to submit without completing it.

---

## 18. Review Form UX

The review form is one of the most important screens in the product.

It should prioritize:

- readability
- low cognitive load
- clear progress
- safe draft saving
- obvious submission behavior

Recommended layout:

```text
Review: Andi
Relationship: Peer
Performance Review H2 2026

Start Date: 20 Aug 2026, 09:00 WIB
Due Date:   31 Aug 2026, 17:00 WIB

Progress: 7 / 10

Question 1
...

Question 2
...

[ Save Draft ]          [ Submit Review ]
```

The user should always understand whether their work is saved and when the review starts/ends. The questionnaire screen must visibly show Start Date and Due Date, each with date, time, and timezone.

Possible save states:

- Saving...
- Saved
- Draft saved

Do not rely only on browser state.

---

## 19. Draft Experience

Saving drafts must feel safe.

When returning to a draft:

- previous answers are pre-filled
- progress is restored
- the primary action should be `Continue Review` or equivalent

A draft can be incomplete.

The design should not imply that draft saving equals submission.

---

## 20. Submission Experience

Submission should be explicit.

Before accepting submission:

- verify all questions are answered
- highlight unanswered questions
- prevent submission if incomplete

A confirmation dialog is acceptable.

Example:

`Submit this review? You can still edit it until the Due Date.`

This message is important because submitted reviews are not immediately locked.

---

## 21. Editing a Submitted Review

Before the exclusive Due Date, a submitted review should still show an `Edit Review` action while the Performance Review is `IN_PROGRESS`.

The UI should clearly communicate:

- Submitted
- Editable until `<Due Date with time and timezone>`; the Due Date is exclusive, so exactly at that instant the review is no longer editable

At the Due Date or after the Performance Review becomes `CLOSED`:

- hide/disable edit controls
- show read-only answers
- clearly indicate that the review is closed

---

## 22. Reviews About Me

The User should have a dedicated page for reviews received.

While the Performance Review is OPEN or IN_PROGRESS, do not reveal incoming answers.

The page may show that results are not yet available.

Example:

`Results will be available after the Performance Review is closed.`

Once CLOSED, show the submitted reviews in read-only form.

Show every assigned source relationship after closure. Where a source has not submitted, retain its anonymous relationship card and display a short empty/unfilled explanation instead of removing it. Before closure, show only a neutral availability explanation and relationship grouping—never answers, drafts, or reviewer identities.

The Reviewee must not be able to edit incoming reviews.

---

## 23. Admin Dashboard

Keep the V1 dashboard practical.

Useful information may include:

- active Performance Reviews
- total review assignments
- not started
- drafts
- submitted
- completion percentage
- approaching Due Dates

Avoid adding advanced charts unless they materially improve usability.

The dashboard should primarily help HR answer:

- What reviews are active?
- How much progress has been made?
- Who still needs to complete a review?

---

## 24. User Dashboard

The User dashboard should primarily answer:

- What reviews do I need to complete?
- What have I already submitted?
- What is the Due Date and time?
- Are review results about me available?

Recommended review cards/list items may show:

- Reviewee name
- Relationship
- Performance Review title
- Due Date with time and timezone
- Assignment status
- Progress
- Available action

---

## 25. Responsive Behavior

Follow Candidate Tracker's responsive approach.

Ensure important workflows remain usable on smaller screens.

Prioritize desktop usability for Admin-heavy configuration screens, but do not allow mobile layouts to break.

Tables may adapt into horizontally scrollable or stacked layouts if consistent with the reference project.

### Print / PDF behavior

The Review Result print layout must hide application chrome and controls, including the desktop sidebar, mobile header, Menu button, navigation, Back, and Export PDF controls. Browser-generated headers and footers are outside application control and may be disabled by the user in the print dialog.

---

## 26. Empty States

Use clear empty states.

Empty lists across Dashboard, Users, Performance Reviews, Question Templates, My Reviews, and Reviews About Me use the same visual component headed `Data Tidak Ada`, followed by a short context-specific explanation.

Examples:

### No Users

`No users have been added yet.`

### No Reviews

`No Performance Reviews have been created.`

### No Assigned Reviews

`You don't have any reviews to complete.`

### Results Not Available

`Your review results will be available after this Performance Review is closed.`

Empty states should guide the User toward the next valid action.

---

## 27. Error and Validation States

Errors should be clear and human-readable.

Examples:

- Username already exists.
- End Date must be after Start Date.
- This reviewer is already assigned.
- Please answer all questions before submitting.
- This review is not editable at this time.
- The Due Date has passed.

Avoid exposing technical database or server errors directly to the User.

---

## 28. Loading States

Use the same loading patterns as Candidate Tracker where possible.

Provide loading feedback for:

- login
- saving draft
- submitting review
- loading tables
- creating/editing users
- creating/editing Performance Reviews

Prevent duplicate submissions when a request is still processing.

---

## 29. Accessibility

Maintain basic accessibility standards.

At minimum:

- visible form labels
- keyboard-accessible controls
- adequate contrast
- visible focus states
- semantic buttons
- rating controls usable by keyboard
- validation messages associated with fields

Do not sacrifice accessibility for visual similarity.

---

## 30. Design Boundaries

Do not introduce a completely new design system.

Do not use visual styles that make the Performance Review application feel unrelated to Candidate Tracker.

Do not copy recruitment-specific screens just because they already exist.

Adapt familiar UI patterns to the new Performance Review domain.

The design target is:

**Same company. Same visual family. Different product.**

---
## 31. Date, Time, and Timezone Presentation

All user-facing Performance Review schedule timestamps must show **date + time + timezone**. This applies to at least:

- Admin Dashboard review cards
- Performance Reviews list/table
- Performance Review configuration/status view
- My Reviews list
- the active review questionnaire screen
- Review Result / print-ready report

Formatting must use the browser's resolved IANA timezone, for example `Asia/Jakarta`, `Asia/Makassar`, or `Asia/Jayapura`. Do not hardcode timezone offsets or manually add/subtract hours.

`datetime-local` inputs are appropriate for editing schedule values because they represent the Admin's local wall-clock time, but API requests must send an unambiguous absolute timestamp.

Use **Due Date** consistently for `end_at` in user-facing copy. Due Date is exclusive for review activity.

---
## 32. Automatic Status Refresh UX

The UI must reflect database-authoritative status changes without requiring a manual browser refresh. Use lightweight application/page-level polling approximately every 10 seconds for relevant Performance Review data.

Also refetch when:

- the window receives focus
- the browser tab becomes visible again

Do not reload the entire page just to refresh status. Do not create one interval per card or small component. Clean up intervals and event listeners when the owning component unmounts.

The UI must never change authoritative Performance Review status purely from a local countdown or browser clock. When a visual countdown reaches zero, refetch from the backend and render the returned status.
