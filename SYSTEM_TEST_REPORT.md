# DOKI Performance Review — System Test Report

## 1. Execution Status

| Item | Result |
|---|---|
| Test date | 16 August 2026 (Asia/Jakarta) |
| Overall status | **BLOCKED — partial execution only** |
| Application bug fixes performed | **None** |
| Static checks | Passed |
| Read-only source/design conformance | Executed |
| Functional/API/database workflow suite | Blocked pending dedicated test database |
| Responsive browser matrix | Not run; browser automation dependency is not installed |
| Destructive/concurrency/anomaly mutation suite | Not run against the primary database |

This report deliberately does not claim full system-test completion. Runtime cases remain blocked until `SYSTEM_TEST_DATABASE_URL` points to a dedicated empty Neon branch/database that is different from the application `DATABASE_URL`.

## 2. Safety Incident and Recovery

The first isolation approach attempted to use a separate PostgreSQL schema through a connection-string `search_path`. Neon pooler ignored that parameter and resolved writes to `public`.

The harness stopped before creating any Performance Review or assignment. It had created only deterministic synthetic fixtures:

- 6 test users
- 8 test template questions

Cleanup was executed immediately with exact fixture usernames/text after verifying the synthetic users had zero assignments. Cleanup result:

```text
removedUsers: 6
removedQuestions: 8
```

No existing application user, review, assignment, answer, or unrelated template question was targeted. The harness now refuses to run unless a separate `SYSTEM_TEST_DATABASE_URL` is supplied and differs from `DATABASE_URL`.

## 3. Executed Checks

| Check | Status | Evidence |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS | Command completed with exit code 0 |
| ESLint | PASS | Command completed with exit code 0 |
| Next.js production build | PASS | 14 pages generated; all routes compiled |
| `git diff --check` | PASS | No whitespace error |
| STATIC-001 runtime reference scan | PASS | No `candidate-tracker`/absolute reference path found in runtime source/config/assets |
| STATIC-003 repository-owned logo | PASS | `public/doki-logo-yellow.png` exists locally |
| System-test harness syntax | PASS | `node --check scripts/system-test.mjs` completed |

## 4. Confirmed Failed Tests

### FAIL-001 — Per-review question configuration and lock UX are absent

| Field | Value |
|---|---|
| Severity | Critical |
| Test IDs | REVQ-001, RTM-019, RTM-020 |
| Requirement | Admin can customize review snapshot questions before start; controls must lock after IN_PROGRESS and remain immutable when CLOSED |
| Actual | Admin UI manages master templates only. Review configuration loads snapshot questions read-only into application data but provides no per-review add/edit/delete/type/reorder UI or explicit locked-state message. No review-question mutation API exists. |
| Evidence | `components/App.tsx` ReviewModal contains metadata and hierarchy only; `app/api` has no review-question mutation route; repository only selects `performance_review_questions` |
| Result | FAIL |

### FAIL-002 — Draft save-state UX is missing

| Field | Value |
|---|---|
| Severity | High |
| Test IDs | UX-DRAFT-001, RTM-013 |
| Requirement | User must understand whether work is Saving, Saved, or Draft saved; duplicate action should be prevented |
| Actual | Save Draft calls `persist(false)` without busy state, disabled state, or success feedback. Repeated clicks remain possible. Successful save immediately closes the form, so no explicit saved state is communicated. |
| Evidence | `components/App.tsx` ReviewForm |
| Result | FAIL |

### FAIL-003 — Review creation is not atomic across hierarchy assignments

| Field | Value |
|---|---|
| Severity | Critical |
| Test IDs | REV-002, REV-010, anomaly workflow/transport catalogue, RTM-009, RTM-027 |
| Requirement | Review and reciprocal assignments must be complete and internally consistent; invalid/failing creation must not leave partial state |
| Actual | Review, snapshot, and Self assignments are committed first. Relationship assignments are then inserted in separate calls. A later foreign-key/network/database failure can leave a created review with only some assignments. |
| Evidence | `lib/server/repository.ts` `createPerformanceReview()` loops over `createAssignment()` after the initial query |
| Result | FAIL |

### FAIL-004 — Reciprocal relationship insertion is not atomic

| Field | Value |
|---|---|
| Severity | Critical |
| Test IDs | REV-002–REV-004, REV-013, concurrency/transport anomalies |
| Requirement | Each hierarchy link generates two correct reciprocal assignments |
| Actual | `createAssignment()` executes the two directional inserts separately without a transaction. Failure after the first insert leaves a one-direction relationship. |
| Evidence | `lib/server/repository.ts` `createAssignment()` |
| Result | FAIL |

### FAIL-005 — Template reorder is non-transactional and not scoped to one template

| Field | Value |
|---|---|
| Severity | High |
| Test IDs | TPL-006, TPL-007, API templates-route anomaly matrix, RTM-021 |
| Requirement | Up/Down ordering must persist deterministically without corrupting question order |
| Actual | The API accepts an arbitrary ID array. Repository updates each ID sequentially without a transaction and does not verify all IDs belong to the selected relationship/template. Failure or tampering can leave partial/duplicate/cross-template sort orders. |
| Evidence | `app/api/templates/route.ts` PATCH and `lib/server/repository.ts` `reorderTemplateQuestions()` |
| Result | FAIL |

### FAIL-006 — Native browser confirmation remains for destructive template deletion

| Field | Value |
|---|---|
| Severity | Medium |
| Test IDs | DESIGN-007, RTM-028, RTM-032 |
| Requirement | Do not use native browser alert/confirm for destructive actions; use application-styled modal |
| Actual | Deleting a template question still calls `confirm("Delete this question?")`. This produces the browser-native dialog previously rejected in the design feedback. |
| Evidence | `components/App.tsx` Templates |
| Result | FAIL |

### FAIL-007 — Print/PDF stylesheet does not hide the actual application shell

| Field | Value |
|---|---|
| Severity | High |
| Test IDs | RPT-004, RPT-005, DESIGN-002, DESIGN-007, RTM-024 |
| Requirement | Print-ready employee report; sidebar/navigation/actions hidden from PDF |
| Actual | Print CSS hides `.app-shell`, but no rendered application element uses that class. Only the report action block has `.no-print`. The sidebar/mobile header/application chrome can therefore be included in print/PDF output. |
| Evidence | `app/globals.css` `@media print`; `components/App.tsx` application shell and ResultReport |
| Result | FAIL |

### FAIL-008 — Raw internal exception messages can reach clients

| Field | Value |
|---|---|
| Severity | High |
| Test IDs | API contract/error matrix, anomaly input/transport catalogue, RTM-032 |
| Requirement | Do not expose technical database or server errors directly to users |
| Actual | `/api/data` and `/api/auth/login` return `error.message` for unexpected failures instead of a safe mapped message. A connection/query failure can disclose internal database/provider details. |
| Evidence | `app/api/data/route.ts`; `app/api/auth/login/route.ts` |
| Result | FAIL |

## 5. Blocked / Not Run

The following areas require the dedicated test database before a valid result can be reported:

- Authentication/session lifecycle with synthetic accounts
- Admin/User API authorization mutation checks
- User CRUD, inactive-user history, and duplicate username behavior
- Full hierarchy assignment and inverse template mapping
- Historical assignment snapshot (`REV-015`)
- Database question-lock triggers (`REVQ-002`–`REVQ-004`)
- Exact start/deadline/timezone boundaries
- Draft persistence, submission, answer validation, and cross-device recovery
- Cross-user status synchronization
- Anonymous incoming payload/result verification
- Atomic delete rollback
- Database constraints, triggers, functions, and reporting views
- Concurrent saves/admin edits/double requests/network interruption
- Mutation-based anomaly catalogue

The responsive viewport matrix, Candidate Tracker visual conformance, keyboard accessibility, and real print/PDF inspection also require a browser test runner or approved manual browser execution.

## 6. Summary

| Category | Count |
|---|---:|
| Confirmed FAIL | 8 |
| Static/build PASS checks | 7 |
| Full runtime suite | Blocked |

The application cannot receive a full system-test sign-off yet. The current report records eight confirmed defects without applying fixes. Execution can continue after a dedicated Neon test branch/database URL is supplied through `SYSTEM_TEST_DATABASE_URL` and, for the responsive/design/PDF matrix, a browser automation environment is approved.

## 7. Required Direction Before Continuing

No application defect has been fixed. Please choose whether to:

1. provide/approve a dedicated empty Neon test branch/database via `SYSTEM_TEST_DATABASE_URL` and continue the remaining tests before fixing anything; or
2. review/prioritize the eight confirmed failures first and authorize a later bug-fix phase.

## 8. Post-Report Change Note (20 August 2026)

This report remains a historical record of the preliminary test execution and must not be read as a current retest result. Subsequent authorized implementation work changed the application after this report was written, including custom confirmation/feedback popups, draft save feedback, atomic create/delete handling, result visibility for unanswered assignments, dashboard filtering, print exclusion for the mobile header/Menu, and the Neon `guard_performance_review_questions()` trigger deployment. The full functional, anomaly, concurrency, and responsive retest suite has **not** yet been rerun; all affected cases remain pending retest in `SYSTEM_TEST_PLAN.md`.
