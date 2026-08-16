# DOKI Performance Review — System Test Plan

## 1. Document Control

| Item | Value |
|---|---|
| Document | System Test Plan |
| Product | DOKI Performance Review V1 |
| Test phase | Planned — execution requires user approval |
| Test types | Functional, integration, authorization, database, business workflow, responsive UI, security, concurrency, recovery, anomaly |
| Source of truth | `PRODUCT_REQUIREMENTS.md`, `DESIGN_REQUIREMENTS.md`, `AGENTS.md`, `database/schema.sql` |

No test in this plan may be executed against production data. Test execution must use a dedicated Neon test branch/database and disposable test accounts.

## 2. Objectives

The system test must provide evidence that:

1. Admin and User capabilities follow the authorization rules.
2. Review assignments, reciprocal hierarchy, question-template mapping, statuses, answers, deadlines, and visibility behave correctly across multiple accounts.
3. Data written through the UI and APIs remains consistent with PostgreSQL constraints, triggers, functions, and reporting views.
4. Reviewer identities remain confidential in employee-facing payloads, screens, and exported reports.
5. Core workflows remain usable across desktop and mobile viewport sizes.
6. Invalid, unexpected, malicious, concurrent, and boundary inputs fail safely without corrupting data or exposing implementation details.

## 3. Scope

### 3.1 In scope

- Authentication, session lifecycle, protected-route redirection, logout, inactive accounts
- `ADMIN` and `USER` authorization at UI, API, and data-response levels
- User creation, editing, activation, deactivation, password reset, duplicate usernames
- Question-template CRUD and Up/Down ordering for all four relationship types
- Performance Review creation, editing, status changes, deletion, and question snapshots
- Searchable participant and hierarchy selection at small and large data volumes
- Automatic Self assignments and reciprocal Manager, Peer, and Subordinate assignments
- Correct question-template selection from the reviewer's perspective
- My Reviews, Reviews About Me, Admin Dashboard, and Review Results synchronization
- Save Draft, resume draft, submit validation, edit-after-submit, and read-only rules
- Start time, deadline, timezone, exact-boundary, deadline-change, and Closed-status behavior
- Anonymous feedback display and anonymized non-Admin API payloads
- Admin result report grouping and browser print/PDF layout
- Empty, loading, error, confirmation, and disabled states
- Desktop, tablet, and mobile responsive behavior
- Database constraints, triggers, snapshot integrity, views, and transaction rollback
- Cross-session, concurrent-update, retry, duplicate-request, and network-failure behavior
- Anomaly and abuse cases defined in Section 12

### 3.2 Out of scope

- Features explicitly excluded from V1, such as email reminders, Excel export, HRIS integration, weighted scoring, and configurable rating scales
- Neon infrastructure availability or performance outside the application's observable behavior
- Formal penetration testing by a certified third party
- Native browser PDF renderer correctness beyond verifying the application's print layout and anonymous content

## 4. Test Approach

Testing will be performed in layers. A scenario is considered passed only when relevant UI, API, and database observations agree.

| Layer | Purpose | Planned method |
|---|---|---|
| Static quality | Detect type, lint, and build failures | TypeScript, ESLint, production build |
| Component/UI | Verify controls, states, keyboard behavior, and layouts | Browser inspection and automated viewport checks where practical |
| API | Verify status codes, authorization, validation, safe messages, and payload privacy | Authenticated HTTP requests using separate session cookies |
| Database | Verify persisted values, relationships, snapshots, constraints, triggers, views, and rollback | Read-only SQL assertions after operations; isolated mutation tests in test DB |
| End-to-end | Verify complete Admin/Reviewer/Reviewee workflows | Multiple browser contexts/accounts |
| Temporal | Verify exact start/deadline and timezone behavior | Short controlled review windows and database timestamps |
| Concurrency | Verify simultaneous users and duplicate requests | Parallel browser/API actions |
| Anomaly | Verify safe behavior for malformed or unexpected states | Boundary, tampering, interruption, and invalid-data scenarios |

## 5. Test Environment and Safety

### 5.1 Required environment

- Dedicated Neon test branch/database initialized from `database/schema.sql`
- Separate `.env.test.local` or explicitly approved temporary test configuration
- Local production build and development server as required by the scenario
- Chromium at minimum; one additional browser engine if available
- Independent browser contexts for Admin, User A, Manager, Peer 1, Peer 2, and Subordinate

### 5.2 Data protection

- Never print, record, or commit `DATABASE_URL`, cookies, password hashes, or real credentials.
- Use synthetic names, usernames, review text, and answers.
- Record IDs only when necessary and redact session tokens from evidence.
- Reset or delete the test database branch after execution.
- Do not run destructive deletion or anomaly tests against the user's primary database.

### 5.3 Proposed test accounts

| Alias | Role | Position | Relationship purpose |
|---|---|---|---|
| HR Admin | ADMIN | HR Administrator | Administration and optional reviewer/reviewee |
| User A | USER | Employee | Primary participant/reviewee |
| Manager A | USER | Manager | Manager of User A |
| Peer A1 | USER | Employee | Peer of User A |
| Peer A2 | USER | Employee | Second peer for anonymity sequencing |
| Subordinate A | USER | Junior Employee | Subordinate of User A |
| Inactive User | USER / INACTIVE | Employee | Authentication and picker filtering |
| Second Admin | ADMIN | HR Administrator | Cross-admin refresh and concurrency |

### 5.4 Question fixtures

Each relationship template must contain at least:

- two `RATING_1_5` questions
- two `ESSAY` questions
- unique text that identifies the source template without exposing reviewer identity

The question order must be intentionally different per relationship to detect mapping errors.

## 6. Entry and Exit Criteria

### 6.1 Entry criteria

- Test plan approved by the user
- Dedicated test database/branch approved and available
- Schema applied successfully
- Test accounts and question fixtures prepared
- Application builds successfully
- No unresolved migration or environment error
- Test start time and timezone recorded

### 6.2 Exit criteria

- All Critical and High-priority cases executed
- No open Critical defect
- No open High defect affecting authentication, authorization, data integrity, deadline enforcement, assignment mapping, anonymity, or answer persistence
- At least 95% pass rate for Medium-priority cases, with every failure documented
- All failed cases retested after fixes
- Database consistency checks pass after the final run
- Test evidence and final report are stored without credentials

## 7. Priority and Severity

| Level | Test priority | Defect severity example |
|---|---|---|
| Critical | Must execute first | Unauthorized data access, reviewer identity leak, corrupted answers, wrong reviewer/reviewee mapping |
| High | Required before release | Deadline bypass, status not synchronized, failed draft persistence, broken review creation/deletion |
| Medium | Required for quality sign-off | Responsive overflow, unclear validation, inaccessible controls, wrong empty state |
| Low | Cosmetic or low-impact | Minor spacing, wording, or non-blocking visual inconsistency |

## 8. Functional and Business Workflow Test Matrix

### 8.1 Authentication and session

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| AUTH-001 | Critical | Open protected URL without a session | Redirect to `/login`; requested path is not rendered |
| AUTH-002 | Critical | Valid active Admin login | Admin session created; Admin navigation shown |
| AUTH-003 | Critical | Valid active User login | User session created; Admin-only navigation hidden |
| AUTH-004 | High | Wrong password, unknown username, blank fields | Login rejected with safe human-readable message |
| AUTH-005 | Critical | Inactive account login | Login rejected; no session created |
| AUTH-006 | Critical | Deactivate an account with an existing session, then call API | Existing session loses access with `403` |
| AUTH-007 | High | Logout, refresh, browser back, direct API call | Session removed and protected content unavailable |
| AUTH-008 | High | Tamper with session cookie | Request rejected without stack trace or sensitive details |
| AUTH-009 | Medium | Username case variation | Case-insensitive username behavior follows database uniqueness/login rules |
| AUTH-010 | High | Two simultaneous sessions for one user | Both sessions show consistent persisted data after refresh |

### 8.2 Authorization and data isolation

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| ACL-001 | Critical | User calls Users POST API directly | `403`; database unchanged |
| ACL-002 | Critical | User calls Reviews POST/PATCH/DELETE directly | `403`; database unchanged |
| ACL-003 | Critical | User calls Templates POST/PATCH/DELETE directly | `403`; database unchanged |
| ACL-004 | Critical | User submits answers for another reviewer's assignment ID | Rejected; no answer/status change |
| ACL-005 | Critical | User requests application data | Only own outgoing assignments and eligible closed incoming results returned |
| ACL-006 | Critical | Inspect incoming result JSON as User | Real reviewer ID/name cannot be derived from incoming assignment fields |
| ACL-007 | High | Admin participates as reviewer and reviewee | Admin can access My Reviews and Reviews About Me while retaining Admin features |
| ACL-008 | High | Inactive user appears in selection | Inactive user is excluded from participant/hierarchy choices |

### 8.3 User management

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| USER-001 | High | Create Admin and User with valid fields | Users persist with correct role/status and can authenticate appropriately |
| USER-002 | High | Create user with blank required field | Rejected with field-level/human-readable validation |
| USER-003 | High | Create duplicate username with case variation | Rejected as duplicate; no database error text exposed |
| USER-004 | High | Edit name, position, username, role, and status | Changes persist and appear after another Admin refresh |
| USER-005 | High | Edit without password | Existing password remains valid |
| USER-006 | High | Reset password | Old password fails; new password succeeds |
| USER-007 | Critical | Deactivate user with historical reviews | Historical data remains readable; login/access blocked |
| USER-008 | Medium | Search/select among 100+ users | Search remains usable; no full-page overflow; selected users are excluded |
| USER-009 | Critical | Inspect UI and attempt unsupported/tampered permanent User deletion after involvement in a review | No destructive User delete UI/endpoint is available; historical User, assignments, answers, and reports remain intact; Admin is directed to use INACTIVE |

### 8.4 Question templates

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| TPL-001 | High | Add Rating and Essay question to each relationship | Questions persist under the correct relationship |
| TPL-002 | High | Edit question text/type | Changes persist and do not alter existing review snapshots |
| TPL-003 | High | Delete template question | Question removed from template; existing snapshots unchanged |
| TPL-004 | High | Move middle question Up then Down | Order swaps once per action and persists after reload |
| TPL-005 | Medium | First/last ordering controls | Up disabled for first; Down disabled for last |
| TPL-006 | High | Rapid repeated ordering clicks | Final order is deterministic; no duplicate/zero sort order |
| TPL-007 | High | Reorder while second Admin edits same template | No data loss; resulting order and text are explainable and consistent |
| TPL-008 | Medium | Empty relationship template | Consistent `Data Tidak Ada` state shown |

### 8.5 Performance Review creation and hierarchy

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| REV-001 | Critical | Create review with User A only and no hierarchy | One Self assignment for User A; no reciprocal non-Self assignment |
| REV-002 | Critical | Create User A with Manager, two Peers, and Subordinate | Expected reciprocal assignments created with no duplicate pair |
| REV-003 | Critical | Verify User A's assignments | Self→SELF, reviews Manager→MANAGER, Peers→PEER, Subordinate→SUBORDINATE |
| REV-004 | Critical | Verify related users' reverse assignments | Manager reviews A→SUBORDINATE; Peers review A→PEER; Subordinate reviews A→MANAGER |
| REV-005 | Critical | Verify question sets for every assignment | Only questions matching assignment relationship are shown/accepted |
| REV-006 | High | Hierarchy person not selected as participant | Reciprocal assignments exist, but no Self assignment is created for that person unless separately selected |
| REV-007 | High | Add same relationship/person twice | Duplicate hidden/prevented; database remains unique |
| REV-008 | High | Choose same user as own non-Self relationship through tampered request | Rejected or ignored; invalid assignment not stored |
| REV-009 | High | Start equals end or end before start | Review rejected with safe validation |
| REV-010 | High | Missing title/start/end/participant | Review rejected; no partial review or assignments stored |
| REV-011 | Critical | Inspect snapshot after creation | All four template categories copied once with correct order/type/text |
| REV-012 | High | Change template after review creation | Existing review questions remain unchanged; new review receives new version |
| REV-013 | High | Add relationship during edit | Both directional assignments appear with correct inverse template mapping |
| REV-014 | Medium | Search 100+ hierarchy candidates | Search remains responsive; current person and selected users do not appear |
| REV-015 | Critical | Change User A's organizational relationship for a later review after an earlier review already exists | Earlier review assignments retain their original reviewer, reviewee, and relationship snapshot; only the later review reflects the changed hierarchy |

### 8.6 Review-question locking and historical integrity

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| REVQ-001 | Critical | Move review to IN_PROGRESS and inspect Admin question controls | Add, delete, type change, reorder, and material edit controls are unavailable or disabled for the review snapshot |
| REVQ-002 | Critical | Attempt direct API/repository mutation of an IN_PROGRESS review question | Backend/database rejects every structural mutation; existing questions and answers remain unchanged |
| REVQ-003 | Critical | Attempt snapshot mutation after review is CLOSED | Snapshot remains immutable through UI and direct request/database guard paths |
| REVQ-004 | High | Modify master templates while another review is IN_PROGRESS/CLOSED | Master template may change for future reviews, but locked historical snapshots and answers remain unchanged |

### 8.7 Review status, time, and deadline

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| TIME-001 | Critical | Attempt save one second before start | Backend rejects; database unchanged |
| TIME-002 | Critical | Save exactly at/just after start | Backend accepts according to server time |
| TIME-003 | Critical | Submit exactly at/just before deadline | Accepted when server time is within inclusive deadline |
| TIME-004 | Critical | Save one second after deadline | Backend rejects; existing answers/status unchanged |
| TIME-005 | Critical | Set status CLOSED before deadline | All assignments immediately read-only; results become eligible to Reviewees |
| TIME-006 | High | Reopen CLOSED review before valid deadline | `closed_at` clears and editability follows status/time rules |
| TIME-007 | High | Extend deadline after submission | Submitted reviewer can edit again until new deadline while status remains SUBMITTED |
| TIME-008 | High | Shorten deadline to past | Further edits blocked immediately |
| TIME-009 | Critical | Admin changes status in one session | Other logged-in users observe updated access/status after refresh/data reload |
| TIME-010 | High | Browser timezone Asia/Jakarta vs database UTC | Displayed local time and server enforcement represent the same instant |
| TIME-011 | High | Date across midnight/month/year boundary | No off-by-one-day or timezone conversion error |
| TIME-012 | Medium | Browser clock intentionally incorrect | Backend decision still follows server/database time |

### 8.8 Draft, submission, persistence, and save-state UX

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| ANS-001 | Critical | Save partially answered review | Status becomes DRAFT; partial answers persist |
| ANS-002 | Critical | Logout/login or use second device after draft | Same draft answers restored |
| ANS-003 | High | Clear previously saved essay then save draft | Empty answer is removed and progress decreases correctly |
| ANS-004 | Critical | Submit with unanswered Rating/Essay | Submission blocked and missing questions highlighted |
| ANS-005 | Critical | Submit all valid answers | Status SUBMITTED and submitted timestamp stored |
| ANS-006 | High | Edit submitted answers before deadline | Answers update; assignment remains SUBMITTED |
| ANS-007 | Critical | Edit submitted answers after deadline/CLOSED | Rejected by backend |
| ANS-008 | Critical | Send rating outside 1–5, essay in rating, rating in essay | Database/API rejects invalid type/value; no corruption |
| ANS-009 | Critical | Submit question ID from another review/relationship | Rejected by validation trigger; no cross-review answer |
| ANS-010 | High | Refresh immediately after save/submit | UI status and answer values match persisted data |
| ANS-011 | High | Two sessions edit same assignment | Final behavior documented; no mixed invalid answer rows or duplicate answers |
| ANS-012 | High | Retry identical save after timeout | Idempotent upsert behavior; no duplicates |
| UX-DRAFT-001 | High | Save a partial draft under normal and delayed network conditions | Save Draft is visible; a Saving/loading state appears; repeated action is prevented; success feedback such as Saved/Draft saved appears; refresh restores the exact persisted values |

### 8.9 Cross-user synchronization and result visibility

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| SYNC-001 | Critical | User A submits; Admin refreshes Dashboard | Submitted count/progress updates correctly |
| SYNC-002 | Critical | Admin changes deadline/status; Reviewer refreshes | Reviewer action availability changes correctly |
| SYNC-003 | Critical | Review OPEN/IN_PROGRESS | Reviewee cannot access incoming answers via UI or API |
| SYNC-004 | Critical | Review CLOSED with submitted incoming feedback | Reviewee sees submitted feedback only |
| SYNC-005 | High | One reviewer remains DRAFT at closure | Draft feedback is not shown as completed incoming result |
| SYNC-006 | Critical | Multiple peers submit | Results labelled Peer 1, Peer 2, etc., without names or stable identifiers |
| SYNC-007 | Critical | Manager and Subordinate submit | Labels reflect source from Reviewee perspective, not stored inverse relationship |
| SYNC-008 | Critical | Admin report vs User result | Answer content/grouping agree; both employee-facing outputs remain anonymous |

### 8.10 Review deletion and atomicity

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| DEL-001 | High | User calls review DELETE | `403`; no change |
| DEL-002 | High | Admin cancels custom confirmation | Review remains intact |
| DEL-003 | Critical | Delete review with answers and submitted assignments | Review, assignments, answers, and snapshots removed together |
| DEL-004 | Critical | Force a failure during deletion in test DB | Transaction rolls back; no partial deletion |
| DEL-005 | High | Delete nonexistent/invalid ID | Safe response; unrelated data unchanged |
| DEL-006 | High | Two Admins delete same review concurrently | One effective deletion; second request fails safely/idempotently without collateral deletion |

### 8.11 Reports and PDF

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| RPT-001 | High | Select review and reviewee | Consolidated submitted results load correctly |
| RPT-002 | Critical | Inspect report headings/content | No reviewer name, username, ID, or identifying metadata appears |
| RPT-003 | High | Multiple feedback sources | Correct Manager/Peer/Subordinate grouping and sequence |
| RPT-004 | High | Print at A4 portrait | Content readable; sections avoid harmful page breaks; controls/sidebar hidden |
| RPT-005 | Critical | Save as PDF and inspect file | Employee name/review title allowed; reviewer identities absent |
| RPT-006 | Medium | Long essays/many questions | Report wraps and paginates without clipping or horizontal overflow |
| RPT-007 | Medium | No submitted results | Consistent empty state; no blank report ambiguity |

## 9. UI, Responsive, and Accessibility Matrix

### 9.1 Planned viewports

| Class | Viewport |
|---|---|
| Small mobile | 320 × 568 |
| Standard mobile | 375 × 667 |
| Large mobile | 430 × 932 |
| Tablet portrait | 768 × 1024 |
| Tablet landscape | 1024 × 768 |
| Desktop | 1366 × 768 |
| Large desktop | 1920 × 1080 |

### 9.2 Pages/components to inspect at every applicable viewport

- Login and password visibility control
- Desktop sidebar collapse/expand; mobile drawer open/close/backdrop/scroll
- Dashboard metrics and clickable review cards
- Users and Performance Reviews responsive tables/cards
- Question-template tabs, question text, Up/Down controls, Edit/Delete actions
- Create/edit User and Performance Review forms
- Participant and hierarchy search popups with long names and 100+ users
- My Reviews, review form, rating inputs, essays, and action buttons
- Reviews About Me and Review Results
- Custom destructive confirmation dialog
- Empty, error, loading, disabled, and long-content states

### 9.3 Responsive acceptance checks

- No page-level horizontal scrolling at any target viewport.
- Intentional internal scroll areas do not move the whole page.
- Text wraps without clipping controls.
- Up/Down question controls remain left of and vertically centered against question text.
- Touch targets remain usable and do not overlap.
- Mobile sidebar has a visible Close control and scrolls to profile/logout.
- No page-level overflow occurs; tables may stack or use contained horizontal scrolling according to the Candidate Tracker reference pattern, while labels and actions remain visible and usable.
- Dialogs stay within viewport and remain dismissible.
- Focus order follows visual order; keyboard operation works for all actions.
- Labels, `aria-label`s, disabled states, contrast, and focus indication are present.

### 9.4 Design conformance to Candidate Tracker

The reference application is inspected read-only. Conformance is pattern-based, not pixel-perfect. Differences are acceptable when required by the Performance Review domain, but they must still feel like the same product family.

| ID | Priority | Reference pattern | Pages/components | Expected result |
|---|---|---|---|---|
| DESIGN-001 | High | Branding and login treatment | Login page, logo, background, card, fields, primary action | Logo usage, visual hierarchy, typography weight, spacing, radii, and color treatment are recognizably consistent |
| DESIGN-002 | High | Application shell | Desktop/mobile shell, sidebar, header, content container | Dimensions, logo placement, navigation rhythm, collapse/drawer behavior, and content spacing follow the same visual family |
| DESIGN-003 | Medium | Typography and spacing | Page headings, section headings, labels, body text, dense/empty pages | Font hierarchy, weights, line height, and spacing rhythm are consistent; no arbitrary unrelated styling |
| DESIGN-004 | High | Buttons and states | Primary, secondary, destructive, disabled, loading actions | Shape, weight, color, hover/focus, disabled, and loading treatments follow the reference patterns |
| DESIGN-005 | High | Form controls | Inputs, password control, date/time, textarea, search picker, select | Heights, labels, borders, focus rings, validation, and spacing remain consistent and accessible |
| DESIGN-006 | Medium | Tables, cards, and badges | Users, Reviews, Dashboard, statuses, mobile table adaptation | Containers, row rhythm, actions, responsive behavior, and semantic status colors match the product family |
| DESIGN-007 | High | Dialogs and overlays | Delete confirmation, picker popup, mobile drawer | Backdrop, elevation, radius, spacing, close behavior, action hierarchy, and viewport containment are consistent |
| DESIGN-008 | Medium | Empty, loading, and error states | All primary pages and asynchronous actions | States use a shared visual language and do not appear as unstyled browser/default output |
| DESIGN-009 | Medium | Domain adaptation | Entire Performance Review app | No recruitment-specific entity, label, workflow, or permission leaks from Candidate Tracker |

### 9.5 Empty-state consistency

| ID | Priority | Parameterized pages | Expected result |
|---|---|---|---|
| UI-EMPTY-001 | Medium | Dashboard, Users, Performance Reviews, Question Templates, My Reviews, Reviews About Me | Every empty collection uses the shared empty-state component, displays heading `Data Tidak Ada`, includes a context-specific explanation, preserves page actions where applicable, and remains responsive |

### 9.6 Runtime independence from the reference project

| ID | Priority | Scenario | Expected result |
|---|---|---|---|
| STATIC-001 | Critical | Scan source, configuration, styles, imports, and public asset references for `candidate-tracker` and absolute reference paths | No runtime import, filesystem path, URL, build alias, or asset dependency targets the reference project; documentation-only references are allowed |
| STATIC-002 | Critical | Build and run the production application in an environment where `D:\Projects\candidate-tracker` is not mounted/accessible | Build, startup, authentication, navigation, and logo rendering succeed using assets owned by this repository |
| STATIC-003 | High | Inspect branding assets used at runtime | Required logo/assets exist under this repository's `public` directory and resolve without fallback to external local paths |

## 10. API Contract and Error Handling

For every route, test unauthenticated, wrong-role, valid, malformed JSON, missing fields, wrong types, nonexistent IDs, duplicate data, and oversized reasonable payloads.

| Route | Methods | Principal assertions |
|---|---|---|
| `/api/auth/login` | POST | Authentication, inactive account, safe error, cookie flags |
| `/api/auth/logout` | POST | Cookie invalidation and repeated logout |
| `/api/auth/me` | GET | Session identity only; no password/hash |
| `/api/data` | GET | Role-aware filtering and anonymization |
| `/api/users` | POST | Admin-only CRUD behavior and duplicate validation |
| `/api/templates` | POST/PATCH/DELETE | Admin-only, relationship validity, ordering integrity |
| `/api/reviews` | POST/PATCH/DELETE | Admin-only, date/participant validation, atomic deletion |
| `/api/assignments` | POST | Admin-only, reciprocal mapping, uniqueness |
| `/api/answers` | PUT | Ownership, time/status enforcement, question relationship/type validation |

All failures must avoid SQL text, constraint names, stack traces, connection details, cookies, and credentials.

## 11. Database Integrity Verification

The following assertions will be checked with SQL in the isolated test database:

1. Usernames are case-insensitively unique.
2. Roles, statuses, relationships, question types, ratings, and dates satisfy checks.
3. Self assignment has the same reviewer/reviewee; non-Self assignments do not.
4. Reviewer/reviewee pair is unique per Performance Review.
5. One answer exists at most once per assignment/question.
6. Answer question and assignment belong to the same review and relationship.
7. Rating and essay columns are mutually valid.
8. Question snapshots are independent from later template mutations.
9. Question mutation locking follows review status/start time.
10. `closed_at` is set/cleared consistently with status transitions.
11. `updated_at` changes on updates.
12. `v_review_assignment_progress` matches actual required/answered questions.
13. `v_performance_review_summary` matches assignment counts and completion percentage.
14. Review deletion leaves no related answers, assignments, or snapshots.
15. Failed transactional operations leave the pre-operation state intact.

## 12. Anomaly Test Catalogue

These tests are intentionally abnormal and will only run after normal workflow tests pass.

### 12.1 Input and payload anomalies

- Empty strings, whitespace-only values, very long text, Unicode, emoji, combining characters, RTL text, quotes, HTML, and script-like strings
- Invalid enum values, negative/zero/huge IDs, decimal ratings, `NaN`-like strings, nulls, arrays/objects where scalars are expected
- Duplicate IDs in participant, relationship, reorder, and answer payloads
- Foreign IDs from another review or relationship
- Missing and malformed JSON bodies
- End date equal to or earlier than start date
- Extremely old/future dates and daylight/timezone boundary values

### 12.2 Authentication and authorization anomalies

- Forged, truncated, expired-like, and deleted-user cookies
- Role changed while session remains active
- Account deactivated during an open review form
- Direct navigation and API calls to every Admin-only function as User
- Reusing another user's assignment ID or anonymous placeholder ID

### 12.3 Workflow/state anomalies

- Submit before start, after deadline, and after Closed
- Save after Admin closes review while form is already open
- Admin changes deadline/status while a reviewer is typing
- Template edited/reordered/deleted after snapshot creation
- Assignment added after answers already exist for reciprocal participant
- Review reopened after closure
- Delete review while users have forms open
- Empty template category used to create a review
- Review with Self only, no hierarchy, or many peers

### 12.4 Concurrency and transport anomalies

- Double-click Save, Submit, Create, Delete, Up, and Down
- Two sessions save different answers to the same assignment simultaneously
- Two Admins edit the same user/review/template simultaneously
- Network interrupted before response, after server commit, and during retry
- API timeout followed by identical retry
- Browser refresh/navigation during save
- Database temporarily unavailable and then restored

### 12.5 Privacy anomalies

- Search all User-visible JSON, DOM, page source, print preview, and PDF text for reviewer names/IDs
- Compare sequence labels across refreshes for accidental identity clues
- Verify hidden UI data is not present in accessible attributes or serialized payloads
- Verify errors never reveal reviewer identity or database details

### 12.6 Layout/content anomalies

- 320 px viewport, 200% zoom, long unbroken names/questions, maximum essays
- 100+ users in search picker
- 50+ questions in a template/review
- Many navigation items and small viewport height
- Empty datasets and partially populated review states
- Print report with long content and multiple pages

## 13. Requirements Traceability Matrix (RTM)

The RTM is the release-coverage control. A requirement is not considered covered merely because a related broad test exists; it must map to one or more explicit test case IDs. `Planned` means the test exists in this approved plan but has not yet been executed.

| RTM ID | Product Requirement | Design Requirement | Test Case IDs | Planned coverage |
|---|---|---|---|---|
| RTM-001 | PR §2: only ADMIN and USER roles; Admin may also participate | DR §5: role-appropriate navigation; Admin receives review menus | AUTH-002, AUTH-003, ACL-007 | Planned |
| RTM-002 | PR §3: Admin user CRUD except permanent historical deletion | DR §10–11: Users table and consistent User form | USER-001–USER-009, ACL-001, DESIGN-005, DESIGN-006 | Planned |
| RTM-003 | PR §3: duplicate username and inactive account behavior | DR §27: human-readable validation | AUTH-005, AUTH-006, AUTH-009, USER-003, API user-route matrix | Planned |
| RTM-004 | PR §3: historical users must not be deleted; use INACTIVE | DR §10: safe User actions without inappropriate destructive control | USER-007, USER-009, DB assertions 1–5 | Planned |
| RTM-005 | PR §4: Performance Review fields/status and Admin management | DR §10–12: Reviews table/form/setup clarity | REV-009, REV-010, TIME-005–TIME-009, DESIGN-005, DESIGN-006 | Planned |
| RTM-006 | PR §4/§18: Admin-only atomic Performance Review deletion | DR §8: custom destructive confirmation | DEL-001–DEL-006, DESIGN-004, DESIGN-007 | Planned |
| RTM-007 | PR §5: exact start/deadline rules enforced on backend | DR §21: controls/read-only state communicate deadline | TIME-001–TIME-012, ANS-007, API answers-route matrix | Planned |
| RTM-008 | PR §6: selected participant receives Self assignment | DR §12–13: understandable participant/setup UI | REV-001, REV-003, REV-006 | Planned |
| RTM-009 | PR §7: reciprocal Manager/Peer/Subordinate assignments | DR §13: hierarchy grouped by User and relationship | REV-002–REV-008, REV-013, SYNC-007 | Planned |
| RTM-010 | PR §7: assignment relationship is a historical snapshot | DR §13: hierarchy UI does not expose raw technical concepts | REV-015, DB assertions 3–4, 8 | Planned |
| RTM-011 | PR §7: searchable selectors exclude selected/inactive users | DR §13: searchable popup picker for large lists | ACL-008, USER-008, REV-014, DESIGN-005 | Planned |
| RTM-012 | PR §8: NOT_STARTED/DRAFT/SUBMITTED per assignment | DR §9, §18–21: badges and review-state UX | ANS-001, ANS-005–ANS-007, SYNC-001, DESIGN-006 | Planned |
| RTM-013 | PR §9: incomplete drafts persist and can continue | DR §18–19: safe draft UX and visible save state | ANS-001–ANS-003, ANS-010–ANS-012, UX-DRAFT-001 | Planned |
| RTM-014 | PR §10: all questions required for submission | DR §17, §20: highlight missing answers and block submit | ANS-004, ANS-008, ANS-009 | Planned |
| RTM-015 | PR §11: submitted answers remain editable until deadline | DR §20–21: explicit submission and editable/read-only communication | ANS-005–ANS-007, TIME-007–TIME-008 | Planned |
| RTM-016 | PR §12: incoming results hidden until CLOSED | DR §22: results unavailable message then read-only results | SYNC-003–SYNC-005, TIME-005, Received-page responsive checks | Planned |
| RTM-017 | PR §12/§18: reviewer identity confidential in employee results/export | DR §22 and report presentation rules | ACL-005–ACL-006, SYNC-006–SYNC-008, RPT-002, RPT-005, privacy anomalies | Planned |
| RTM-018 | PR §13: four relationship-specific templates | DR §14: Self/Manager/Peer/Subordinate template UI | TPL-001–TPL-008, REV-003–REV-005 | Planned |
| RTM-019 | PR §14: questions copied as immutable historical snapshot | DR §15: review question configuration and lock indication | REV-011, REV-012, REVQ-001–REVQ-004, DB assertions 8–9 | Planned |
| RTM-020 | PR §14: no add/delete/type/reorder/material edit after IN_PROGRESS; CLOSED immutable | DR §15: locked controls and clear explanation | REVQ-001, REVQ-002, REVQ-003 | Planned |
| RTM-021 | PR §13–14: add/edit/delete/reorder template questions | DR §14: explicit Up/Down ordering controls | TPL-001–TPL-008, Question Template viewport checks | Planned |
| RTM-022 | PR §15: Rating 1–5 and Essay only | DR §16–17: accessible rating and comfortable essay controls | ANS-004, ANS-008, ANS-009, accessibility checks | Planned |
| RTM-023 | PR §16: focused Admin navigation/dashboard/results | DR §5, §23: Admin shell and practical metrics | ACL-007, SYNC-001–SYNC-002, RPT-001, DESIGN-002 | Planned |
| RTM-024 | PR §16/§18: consolidated anonymous Admin report and PDF | DR §22–23 plus print presentation | RPT-001–RPT-007, SYNC-008, privacy/layout anomalies | Planned |
| RTM-025 | PR §17: User navigation, My Reviews, Reviews About Me | DR §5, §24: User-focused dashboard/actions | AUTH-003, ANS-001–ANS-007, SYNC-003–SYNC-007, DESIGN-002 | Planned |
| RTM-026 | PR §18: server authorization boundaries | DR §5: Admin-only navigation not shown to User | ACL-001–ACL-008, API route matrix | Planned |
| RTM-027 | PR §20: end-to-end Admin→review→draft/submit→closed→results flow | DR §12, §18–24: coherent setup/review/result journey | REV-001–REV-015, TIME-001–TIME-012, ANS-001–ANS-012, SYNC-001–SYNC-008 | Planned |
| RTM-028 | — (design-only): same company/product family as Candidate Tracker | DR §1–5, §8–11, §27–30 | DESIGN-001–DESIGN-009 | Planned |
| RTM-029 | — (design-only): repository-owned branding assets; no runtime reference dependency | DR §3–4, §30 | STATIC-001–STATIC-003 | Planned |
| RTM-030 | — (design-only): responsive behavior without broken mobile workflows | DR §5, §25 | Responsive viewport matrix, DESIGN-002, DESIGN-006, DESIGN-007 | Planned |
| RTM-031 | — (design-only): consistent cross-page empty states | DR §26 | UI-EMPTY-001, TPL-008, RPT-007 | Planned |
| RTM-032 | — (design-only): loading/error/validation/accessibility | DR §27–29 | AUTH-004, USER-002–USER-003, REV-009–REV-010, UX-DRAFT-001, DESIGN-004–DESIGN-008, API matrix | Planned |
| RTM-033 | Database contract: constraints, triggers, views, snapshot/answer validation | DR §27–29: safe feedback and integrity-visible behavior | DB assertions 1–15, ANS-008–ANS-009, REVQ-002–REVQ-004, DEL-003–DEL-004 | Planned |

### 13.1 RTM coverage review procedure

Before execution:

1. Re-read the latest Product and Design Requirements.
2. Add an RTM row for every new or changed requirement.
3. Reject approval if any requirement has no explicit test ID.
4. Mark each mapped case Pass/Fail/Blocked during execution.
5. A requirement is Passed only when all Critical/High cases mapped to it pass.
6. Any intentionally untested requirement must be marked as a documented risk, not silently omitted.

## 14. Execution Order

1. Revalidate the RTM against the latest Product and Design Requirements.
2. Provision and verify isolated test database.
3. Run static checks, runtime-reference independence checks, and production build.
4. Seed synthetic accounts/templates.
5. Execute authentication and authorization tests.
6. Execute user/template administration tests.
7. Execute review creation, hierarchy history, question-locking, and relationship-mapping tests.
8. Execute draft UX, submission, and time-boundary tests across multiple sessions.
9. Execute result visibility, anonymity, and report/PDF tests.
10. Execute Candidate Tracker design-conformance review and responsive/accessibility matrix.
11. Execute empty-state consistency and database integrity assertions.
12. Execute concurrency, failure-recovery, and anomaly catalogue.
13. Retest defects and run regression smoke suite.
14. Update RTM results, produce the test execution report, and clean up the test environment.

## 15. Evidence and Deliverables

Planned output after execution:

- `SYSTEM_TEST_REPORT.md` — environment, summary, pass/fail counts, defects, risks, conclusion
- `test-evidence/` — sanitized screenshots, request/response excerpts, SQL assertion results, and viewport evidence if approved for repository storage
- Machine-readable case result table (`CSV` or Markdown) with case ID, timestamp, actor, expected, actual, status, and evidence reference
- Executed RTM with requirement-level Pass/Fail/Blocked status and linked evidence
- Defect list with severity, reproduction steps, affected data, and retest result

Credentials, raw cookies, real connection strings, and password hashes must never be included in evidence.

## 16. Approval Gate

This document is the planning deliverable only. No system, functional, database mutation, concurrency, destructive, or anomaly test may begin until the user approves this plan and authorizes the isolated test environment.

Before execution, confirm:

- [ ] Scope approved
- [ ] Dedicated Neon test branch/database approved
- [ ] Test data may be created and destroyed
- [ ] Browser/PDF evidence storage location approved
- [ ] Execution may begin for Sections 8–12
