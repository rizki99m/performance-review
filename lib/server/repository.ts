import "server-only";
import { hash } from "bcryptjs";
import { db } from "./db";
import type {
  AppData,
  Assignment,
  PerformanceReview,
  Question,
  Relationship,
  User,
} from "../types";
import type { SafeSessionUser } from "./auth";

type Row = Record<string, unknown>;
const mapUser = (r: Row): User => ({
  id: String(r.id),
  name: String(r.name),
  position: String(r.position),
  username: String(r.username),
  role: r.role as User["role"],
  status: r.status as User["status"],
});
const mapQuestion = (r: Row): Question => ({
  id: String(r.id),
  relationship: r.relationship_type as Relationship,
  text: String(r.question_text),
  type: r.question_type as Question["type"],
  order: Number(r.sort_order),
});

export async function loadApplicationData(
  session: SafeSessionUser,
): Promise<AppData> {
  const sql = db();

  // Wake Neon if needed and synchronize physical status first.
  await sql`SELECT public.sync_performance_review_statuses()`;

  const [
    userRows,
    templateRows,
    questionRows,
    reviewRows,
    assignmentRows,
    answerRows,
  ] = await Promise.all([
    sql`
      SELECT id::text, name, position, username, role, status
      FROM users
      ORDER BY name
    `,

    sql`
      SELECT id::text, relationship_type
      FROM question_templates
      WHERE is_active = TRUE
    `,

    sql`
      SELECT
        tq.id::text,
        qt.relationship_type,
        tq.question_text,
        tq.question_type,
        tq.sort_order
      FROM template_questions tq
      JOIN question_templates qt
        ON qt.id = tq.template_id
      WHERE qt.is_active = TRUE
      ORDER BY qt.relationship_type, tq.sort_order
    `,

    session.role === "ADMIN"
      ? sql`
          SELECT
            id::text,
            title,
            COALESCE(description, '') AS description,
            start_at,
            end_at,
            CASE
              WHEN statement_timestamp() >= end_at THEN 'CLOSED'
              WHEN statement_timestamp() >= start_at THEN 'IN_PROGRESS'
              ELSE 'OPEN'
            END AS status
          FROM performance_reviews
          ORDER BY start_at DESC
        `
      : sql`
          SELECT DISTINCT
            pr.id::text,
            pr.title,
            COALESCE(pr.description, '') AS description,
            pr.start_at,
            pr.end_at,
            CASE
              WHEN statement_timestamp() >= pr.end_at THEN 'CLOSED'
              WHEN statement_timestamp() >= pr.start_at THEN 'IN_PROGRESS'
              ELSE 'OPEN'
            END AS status
          FROM performance_reviews pr
          JOIN review_assignments ra
            ON ra.performance_review_id = pr.id
          WHERE
            ra.reviewer_user_id = ${session.id}::bigint
            OR (
              ra.reviewee_user_id = ${session.id}::bigint
              AND statement_timestamp() >= pr.end_at
            )
          ORDER BY pr.start_at DESC
        `,

    session.role === "ADMIN"
      ? sql`
          SELECT
            id::text,
            performance_review_id::text,
            reviewer_user_id::text,
            reviewee_user_id::text,
            relationship_type,
            status,
            submitted_at
          FROM review_assignments
        `
      : sql`
          SELECT
            ra.id::text,
            ra.performance_review_id::text,
            ra.reviewer_user_id::text,
            ra.reviewee_user_id::text,
            ra.relationship_type,
            ra.status,
            ra.submitted_at
          FROM review_assignments ra
          JOIN performance_reviews pr
            ON pr.id = ra.performance_review_id
          WHERE
            ra.reviewer_user_id = ${session.id}::bigint
            OR (
              ra.reviewee_user_id = ${session.id}::bigint
              AND statement_timestamp() >= pr.end_at
              AND ra.status = 'SUBMITTED'
            )
        `,

    session.role === "ADMIN"
      ? sql`
          SELECT
            review_assignment_id::text,
            review_question_id::text,
            rating_value,
            essay_value
          FROM review_answers
        `
      : sql`
          SELECT
            ans.review_assignment_id::text,
            ans.review_question_id::text,
            ans.rating_value,
            ans.essay_value
          FROM review_answers ans
          JOIN review_assignments ra
            ON ra.id = ans.review_assignment_id
          JOIN performance_reviews pr
            ON pr.id = ra.performance_review_id
          WHERE
            ra.reviewer_user_id = ${session.id}::bigint
            OR (
              ra.reviewee_user_id = ${session.id}::bigint
              AND statement_timestamp() >= pr.end_at
              AND ra.status = 'SUBMITTED'
            )
        `,
  ]);

  const reviewIds = reviewRows.map((r) => String(r.id));

  const reviewQuestionRows = reviewIds.length
    ? session.role === "ADMIN"
      ? await sql`
          SELECT
            id::text,
            performance_review_id::text,
            relationship_type,
            question_text,
            question_type,
            sort_order
          FROM performance_review_questions
          WHERE performance_review_id = ANY(${reviewIds}::bigint[])
          ORDER BY relationship_type, sort_order
        `
      : await sql`
          SELECT
            prq.id::text,
            prq.performance_review_id::text,
            prq.relationship_type,
            prq.question_text,
            prq.question_type,
            prq.sort_order
          FROM performance_review_questions prq
          JOIN performance_reviews pr
            ON pr.id = prq.performance_review_id
          WHERE
            prq.performance_review_id = ANY(${reviewIds}::bigint[])
            AND statement_timestamp() >= pr.start_at
          ORDER BY prq.relationship_type, prq.sort_order
        `
    : [];

  const answers = new Map<string, Record<string, string | number>>();

  for (const r of answerRows) {
    const key = String(r.review_assignment_id);
    const current = answers.get(key) ?? {};

    current[String(r.review_question_id)] =
      r.rating_value === null ? String(r.essay_value) : Number(r.rating_value);

    answers.set(key, current);
  }

  const assignments = assignmentRows.map((r): Assignment => {
    const reviewerId = String(r.reviewer_user_id);
    const revieweeId = String(r.reviewee_user_id);
    const relationship = r.relationship_type as Relationship;

    return {
      id: String(r.id),
      reviewId: String(r.performance_review_id),
      reviewerId:
        session.role !== "ADMIN" &&
        revieweeId === session.id &&
        reviewerId !== session.id
          ? `anonymous-${relationship}-${r.id}`
          : reviewerId,
      revieweeId,
      relationship,
      status: r.status as Assignment["status"],
      answers: answers.get(String(r.id)) ?? {},
      submittedAt: r.submitted_at
        ? new Date(String(r.submitted_at)).toISOString()
        : undefined,
    };
  });

  const reviews: PerformanceReview[] = reviewRows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    startDate: new Date(String(r.start_at)).toISOString(),
    endDate: new Date(String(r.end_at)).toISOString(),
    status: r.status as PerformanceReview["status"],
    questions: reviewQuestionRows
      .filter((q) => String(q.performance_review_id) === String(r.id))
      .map(mapQuestion),
    assignments: assignments.filter((a) => a.reviewId === String(r.id)),
  }));

  const templates = Object.fromEntries(
    (["SELF", "MANAGER", "PEER", "SUBORDINATE"] as Relationship[]).map(
      (rel) => [
        rel,
        questionRows
          .filter((r) => r.relationship_type === rel)
          .map(mapQuestion),
      ],
    ),
  ) as AppData["templates"];

  void templateRows;

  return {
    users: userRows.map(mapUser),
    templates,
    reviews,
  };
}

export async function saveUser(
  input: Omit<User, "id"> & { id?: string; password?: string },
) {
  if (!input.name?.trim() || !input.position?.trim() || !input.username?.trim())
    throw new Error("Semua field wajib diisi.");
  const sql = db();
  if (input.id) {
    if (input.password) {
      const passwordHash = await hash(input.password, 12);
      await sql`UPDATE users SET name=${input.name.trim()},position=${input.position.trim()},username=${input.username.trim()},password_hash=${passwordHash},role=${input.role},status=${input.status} WHERE id=${input.id}::bigint`;
    } else
      await sql`UPDATE users SET name=${input.name.trim()},position=${input.position.trim()},username=${input.username.trim()},role=${input.role},status=${input.status} WHERE id=${input.id}::bigint`;
  } else {
    if (!input.password) throw new Error("Password is required.");
    const passwordHash = await hash(input.password, 12);
    await sql`INSERT INTO users(name,position,username,password_hash,role,status) VALUES(${input.name.trim()},${input.position.trim()},${input.username.trim()},${passwordHash},${input.role},${input.status})`;
  }
}
export async function saveTemplateQuestion(
  rel: Relationship,
  q: Partial<Question> & Pick<Question, "text" | "type">,
) {
  const sql = db();
  if (q.id)
    await sql`UPDATE template_questions SET question_text=${q.text},question_type=${q.type} WHERE id=${q.id}::bigint`;
  else
    await sql`INSERT INTO template_questions(template_id,question_text,question_type,sort_order) SELECT id,${q.text},${q.type},COALESCE((SELECT MAX(sort_order)+1 FROM template_questions WHERE template_id=question_templates.id),1) FROM question_templates WHERE relationship_type=${rel}`;
}
export async function deleteTemplateQuestion(id: string) {
  await db()`DELETE FROM template_questions WHERE id=${id}::bigint`;
}
export async function reorderTemplateQuestions(ids: string[]) {
  const sql = db();
  for (let index = 0; index < ids.length; index++)
    await sql`UPDATE template_questions SET sort_order=${index + 1} WHERE id=${ids[index]}::bigint`;
}
type RelationshipLink = {
  revieweeId: string;
  reviewerId: string;
  relationship: Exclude<Relationship, "SELF">;
};
const reciprocal = (relationship: Relationship): Relationship =>
  relationship === "MANAGER"
    ? "SUBORDINATE"
    : relationship === "SUBORDINATE"
      ? "MANAGER"
      : relationship;
export async function createPerformanceReview(
  input: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    revieweeIds: string[];
    relationships?: RelationshipLink[];
  },
  adminId: string,
) {
  if (!input.title.trim() || !input.startDate || !input.endDate)
    throw new Error("Semua field wajib diisi.");
  if (new Date(input.endDate) <= new Date(input.startDate))
    throw new Error("End Date harus setelah Start Date.");
  if (!input.revieweeIds.length) throw new Error("Pilih minimal satu peserta.");
  const sql = db();
  const rows = await sql`
  WITH new_review AS (
    INSERT INTO performance_reviews(
      title,
      description,
      start_at,
      end_at,
      created_by
    )
    VALUES(
      ${input.title.trim()},
      ${input.description.trim()},
      ${input.startDate}::timestamptz,
      ${input.endDate}::timestamptz,
      ${adminId}::bigint
    )
    RETURNING id
  ),
  copied AS (
    SELECT copy_templates_to_performance_review(id) copied_count
    FROM new_review
  ),
  self_assignments AS (
    INSERT INTO review_assignments(
      performance_review_id,
      reviewer_user_id,
      reviewee_user_id,
      relationship_type
    )
    SELECT nr.id, u, u, 'SELF'
    FROM new_review nr
    CROSS JOIN unnest(${input.revieweeIds}::bigint[]) u
    RETURNING id
  )
  SELECT
    id::text,
    (SELECT copied_count FROM copied),
    (SELECT COUNT(*) FROM self_assignments)
  FROM new_review
`;
  const reviewId = String(rows[0].id);
  const unique = new Map<string, RelationshipLink>();
  for (const link of input.relationships ?? []) {
    if (link.revieweeId === link.reviewerId) continue;
    unique.set(`${link.revieweeId}:${link.reviewerId}`, link);
  }
  for (const link of unique.values())
    await createAssignment({ reviewId, ...link });
  return reviewId;
}

export async function updatePerformanceReview(input: {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}) {
  if (!input.title.trim() || !input.startDate || !input.endDate)
    throw new Error("Semua field wajib diisi.");
  if (new Date(input.endDate) <= new Date(input.startDate))
    throw new Error("End Date harus setelah Start Date.");
  await db()`UPDATE performance_reviews SET title=${input.title.trim()},description=${input.description.trim()},start_at=${input.startDate}::timestamptz,end_at=${input.endDate}::timestamptz WHERE id=${input.id}::bigint`;
}
export async function deletePerformanceReview(id: string) {
  const sql = db();
  await sql.transaction((txn) => [
    txn`DELETE FROM review_answers WHERE review_assignment_id IN (SELECT id FROM review_assignments WHERE performance_review_id=${id}::bigint)`,
    txn`DELETE FROM review_assignments WHERE performance_review_id=${id}::bigint`,
    txn`UPDATE performance_reviews SET status='OPEN',start_at=NOW()+INTERVAL '1 day' WHERE id=${id}::bigint`,
    txn`DELETE FROM performance_review_questions WHERE performance_review_id=${id}::bigint`,
    txn`DELETE FROM performance_reviews WHERE id=${id}::bigint`,
  ]);
}
export async function createAssignment(input: {
  reviewId: string;
  revieweeId: string;
  reviewerId: string;
  relationship: Exclude<Relationship, "SELF">;
}) {
  const sql = db();
  await sql`INSERT INTO review_assignments(performance_review_id,reviewer_user_id,reviewee_user_id,relationship_type) VALUES(${input.reviewId}::bigint,${input.reviewerId}::bigint,${input.revieweeId}::bigint,${reciprocal(input.relationship)}) ON CONFLICT(performance_review_id,reviewer_user_id,reviewee_user_id) DO NOTHING`;
  await sql`INSERT INTO review_assignments(performance_review_id,reviewer_user_id,reviewee_user_id,relationship_type) VALUES(${input.reviewId}::bigint,${input.revieweeId}::bigint,${input.reviewerId}::bigint,${input.relationship}) ON CONFLICT(performance_review_id,reviewer_user_id,reviewee_user_id) DO NOTHING`;
}
export async function saveAnswers(
  assignmentId: string,
  userId: string,
  answers: Record<string, string | number>,
  submit: boolean,
) {
  const sql = db();

  const assignment = await sql`
    SELECT
      ra.id,
      (
        statement_timestamp() >= pr.start_at
        AND statement_timestamp() < pr.end_at
      ) AS is_editable
    FROM review_assignments ra
    JOIN performance_reviews pr
      ON pr.id = ra.performance_review_id
    WHERE
      ra.id = ${assignmentId}::bigint
      AND ra.reviewer_user_id = ${userId}::bigint
  `;

  if (!assignment[0]) {
    throw new Error("Review assignment not found.");
  }

  if (assignment[0].is_editable !== true) {
    throw new Error("This review is not editable at this time.");
  }

  for (const [questionId, value] of Object.entries(answers)) {
    const isRating = typeof value === "number";
    const essay = String(value).trim();

    if (!isRating && !essay) {
      await sql`
        DELETE FROM review_answers
        WHERE
          review_assignment_id = ${assignmentId}::bigint
          AND review_question_id = ${questionId}::bigint
          AND EXISTS (
            SELECT 1
            FROM review_assignments ra
            JOIN performance_reviews pr
              ON pr.id = ra.performance_review_id
            WHERE
              ra.id = ${assignmentId}::bigint
              AND ra.reviewer_user_id = ${userId}::bigint
              AND statement_timestamp() >= pr.start_at
              AND statement_timestamp() < pr.end_at
          )
      `;

      continue;
    }

    const saved = await sql`
      INSERT INTO review_answers(
        review_assignment_id,
        review_question_id,
        rating_value,
        essay_value
      )
      SELECT
        ${assignmentId}::bigint,
        ${questionId}::bigint,
        ${isRating ? value : null},
        ${isRating ? null : essay}
      WHERE EXISTS (
        SELECT 1
        FROM review_assignments ra
        JOIN performance_reviews pr
          ON pr.id = ra.performance_review_id
        WHERE
          ra.id = ${assignmentId}::bigint
          AND ra.reviewer_user_id = ${userId}::bigint
          AND statement_timestamp() >= pr.start_at
          AND statement_timestamp() < pr.end_at
      )
      ON CONFLICT(
        review_assignment_id,
        review_question_id
      )
      DO UPDATE SET
        rating_value = EXCLUDED.rating_value,
        essay_value = EXCLUDED.essay_value
      RETURNING review_assignment_id
    `;

    if (!saved[0]) {
      throw new Error("This review is not editable at this time.");
    }
  }

  if (submit) {
    const progress = await sql`
      SELECT
        total_questions,
        answered_questions
      FROM v_review_assignment_progress
      WHERE review_assignment_id = ${assignmentId}::bigint
    `;

    if (
      !progress[0] ||
      Number(progress[0].answered_questions) !==
        Number(progress[0].total_questions)
    ) {
      throw new Error("Please answer all questions before submitting.");
    }

    const updated = await sql`
      UPDATE review_assignments AS ra
      SET
        status = 'SUBMITTED',
        started_at = COALESCE(
          ra.started_at,
          statement_timestamp()
        ),
        submitted_at = statement_timestamp()
      FROM performance_reviews AS pr
      WHERE
        ra.id = ${assignmentId}::bigint
        AND ra.reviewer_user_id = ${userId}::bigint
        AND pr.id = ra.performance_review_id
        AND statement_timestamp() >= pr.start_at
        AND statement_timestamp() < pr.end_at
      RETURNING ra.id
    `;

    if (!updated[0]) {
      throw new Error("This review is not editable at this time.");
    }
  } else {
    const updated = await sql`
      UPDATE review_assignments AS ra
      SET
        status = CASE
          WHEN ra.status = 'SUBMITTED' THEN 'SUBMITTED'
          ELSE 'DRAFT'
        END,
        started_at = COALESCE(
          ra.started_at,
          statement_timestamp()
        )
      FROM performance_reviews AS pr
      WHERE
        ra.id = ${assignmentId}::bigint
        AND ra.reviewer_user_id = ${userId}::bigint
        AND pr.id = ra.performance_review_id
        AND statement_timestamp() >= pr.start_at
        AND statement_timestamp() < pr.end_at
      RETURNING ra.id
    `;

    if (!updated[0]) {
      throw new Error("This review is not editable at this time.");
    }
  }
}
