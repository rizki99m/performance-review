import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const envFile = await readFile(".env.local", "utf8");
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!process.env.SYSTEM_TEST_DATABASE_URL) throw new Error("SYSTEM_TEST_DATABASE_URL must point to a dedicated empty Neon test branch/database.");
if (process.env.SYSTEM_TEST_DATABASE_URL === process.env.DATABASE_URL) throw new Error("Refusing to run system tests against the application database.");

const testUrl = new URL(process.env.SYSTEM_TEST_DATABASE_URL);
const sql = neon(testUrl.toString());
const results = [];
let server;

const record = (id, passed, actual, expected) => results.push({ id, passed, actual, expected });
const check = (id, condition, actual, expected) => record(id, Boolean(condition), String(actual), expected);
const query = (text, params = []) => sql.query(text, params);

function splitSql(source) {
  const statements = [];
  let current = "", quote = null, dollar = null, lineComment = false, blockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (lineComment) { current += c; if (c === "\n") lineComment = false; continue; }
    if (blockComment) { current += c; if (c === "*" && next === "/") { current += next; i++; blockComment = false; } continue; }
    if (!quote && !dollar && c === "-" && next === "-") { current += c + next; i++; lineComment = true; continue; }
    if (!quote && !dollar && c === "/" && next === "*") { current += c + next; i++; blockComment = true; continue; }
    if (!quote && c === "$" ) { const match = source.slice(i).match(/^\$[A-Za-z0-9_]*\$/); if (match) { const tag = match[0]; current += tag; i += tag.length - 1; dollar = dollar === tag ? null : (dollar ?? tag); continue; } }
    if (!dollar && (c === "'" || c === '"')) { if (quote === c && next === c) { current += c + next; i++; continue; } quote = quote === c ? null : (quote ?? c); current += c; continue; }
    if (!quote && !dollar && c === ";") { if (current.trim()) statements.push(current.trim()); current = ""; continue; }
    current += c;
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => !/^(BEGIN|COMMIT)$/i.test(s.replace(/^--.*$/gm, "").trim()));
}

async function request(path, { cookie, method = "GET", body } = {}) {
  const response = await fetch(`http://127.0.0.1:3101${path}`, {
    method,
    redirect: "manual",
    headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch {}
  return { response, data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

async function login(username, password = "Passw0rd!") {
  const result = await request("/api/auth/login", { method: "POST", body: { username, password } });
  return { ...result, session: result.cookie };
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch("http://127.0.0.1:3101/login"); if (r.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Test server did not start.");
}

try {
  const schema = await readFile("database/schema.sql", "utf8");
  for (const statement of splitSql(schema)) await sql.unsafe(statement);

  const passwordHash = await hash("Passw0rd!", 4);
  const users = [
    ["HR Admin", "HR", "test_admin", "ADMIN", "ACTIVE"],
    ["User A", "Employee", "test_user_a", "USER", "ACTIVE"],
    ["Manager A", "Manager", "test_manager", "USER", "ACTIVE"],
    ["Peer A", "Employee", "test_peer", "USER", "ACTIVE"],
    ["Subordinate A", "Junior", "test_subordinate", "USER", "ACTIVE"],
    ["Inactive", "Employee", "test_inactive", "USER", "INACTIVE"],
  ];
  for (const [name, position, username, role, status] of users) await query("INSERT INTO users(name,position,username,password_hash,role,status) VALUES($1,$2,$3,$4,$5,$6)", [name, position, username, passwordHash, role, status]);
  for (const rel of ["SELF", "MANAGER", "PEER", "SUBORDINATE"]) {
    await query("INSERT INTO template_questions(template_id,question_text,question_type,sort_order) SELECT id,$1,'RATING_1_5',1 FROM question_templates WHERE relationship_type=$2", [`${rel} rating`, rel]);
    await query("INSERT INTO template_questions(template_id,question_text,question_type,sort_order) SELECT id,$1,'ESSAY',2 FROM question_templates WHERE relationship_type=$2", [`${rel} essay`, rel]);
  }

  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "pnpm exec next start -p 3101"] : ["exec", "next", "start", "-p", "3101"];
  server = spawn(command, args, { env: { ...process.env, DATABASE_URL: testUrl.toString() }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  await waitForServer();

  const protectedPage = await request("/");
  check("AUTH-001", protectedPage.response.status === 307 && protectedPage.response.headers.get("location")?.includes("/login"), protectedPage.response.status, "307 redirect to /login");

  const admin = await login("test_admin");
  const userA = await login("test_user_a");
  const manager = await login("test_manager");
  const peer = await login("test_peer");
  const subordinate = await login("test_subordinate");
  const inactive = await login("test_inactive");
  check("AUTH-002", admin.response.status === 200 && Boolean(admin.session), admin.response.status, "200 and session");
  check("AUTH-003", userA.response.status === 200 && Boolean(userA.session), userA.response.status, "200 and session");
  check("AUTH-005", inactive.response.status === 401 && !inactive.session, inactive.response.status, "401 and no session");

  const forbidden = await request("/api/users", { cookie: userA.session, method: "POST", body: { name: "X" } });
  check("ACL-001", forbidden.response.status === 403, forbidden.response.status, "403");
  const deleteUserAttempt = await request("/api/users?id=2", { cookie: admin.session, method: "DELETE" });
  const userStillExists = await query("SELECT COUNT(*)::int count FROM users WHERE username='test_user_a'");
  check("USER-009", deleteUserAttempt.response.status === 405 && userStillExists[0].count === 1, `${deleteUserAttempt.response.status}/${userStillExists[0].count}`, "405 and historical user remains");

  const ids = Object.fromEntries((await query("SELECT username,id::text FROM users")).map(r => [r.username, r.id]));
  const now = Date.now();
  const create = await request("/api/reviews", { cookie: admin.session, method: "POST", body: {
    title: "System Test Review", description: "isolated", startDate: new Date(now + 60_000).toISOString(), endDate: new Date(now + 3_600_000).toISOString(), revieweeIds: [ids.test_user_a], relationships: [
      { revieweeId: ids.test_user_a, reviewerId: ids.test_manager, relationship: "MANAGER" },
      { revieweeId: ids.test_user_a, reviewerId: ids.test_peer, relationship: "PEER" },
      { revieweeId: ids.test_user_a, reviewerId: ids.test_subordinate, relationship: "SUBORDINATE" },
    ]
  }});
  check("REV-002", create.response.status === 200 && Boolean(create.data?.id), create.response.status, "200 with review ID");
  const reviewId = create.data.id;
  const assignments = await query("SELECT reviewer_user_id::text reviewer,reviewee_user_id::text reviewee,relationship_type relationship,status FROM review_assignments WHERE performance_review_id=$1 ORDER BY id", [reviewId]);
  check("REV-001", assignments.filter(a => a.relationship === "SELF").length === 1, assignments.filter(a => a.relationship === "SELF").length, "one Self assignment");
  check("REV-003", assignments.some(a => a.reviewer === ids.test_user_a && a.reviewee === ids.test_manager && a.relationship === "MANAGER") && assignments.some(a => a.reviewer === ids.test_user_a && a.reviewee === ids.test_peer && a.relationship === "PEER") && assignments.some(a => a.reviewer === ids.test_user_a && a.reviewee === ids.test_subordinate && a.relationship === "SUBORDINATE"), JSON.stringify(assignments), "User A outgoing mapping correct");
  check("REV-004", assignments.some(a => a.reviewer === ids.test_manager && a.reviewee === ids.test_user_a && a.relationship === "SUBORDINATE") && assignments.some(a => a.reviewer === ids.test_subordinate && a.reviewee === ids.test_user_a && a.relationship === "MANAGER"), JSON.stringify(assignments), "reverse mapping correct");
  check("REV-007", assignments.length === 7, assignments.length, "7 unique assignments");
  const snapshots = await query("SELECT relationship_type,COUNT(*)::int count FROM performance_review_questions WHERE performance_review_id=$1 GROUP BY relationship_type", [reviewId]);
  check("REV-011", snapshots.length === 4 && snapshots.every(r => r.count === 2), JSON.stringify(snapshots), "2 questions for each of 4 relationships");

  const selfAssignment = await query("SELECT id::text FROM review_assignments WHERE performance_review_id=$1 AND relationship_type='SELF'", [reviewId]);
  const beforeStart = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: {}, submit: false } });
  check("TIME-001", beforeStart.response.status === 400, beforeStart.response.status, "request rejected before start");
  await request("/api/reviews", { cookie: admin.session, method: "PATCH", body: { id: reviewId, title: "System Test Review", description: "isolated", startDate: new Date(now - 60_000).toISOString(), endDate: new Date(now + 3_600_000).toISOString() } });
  const selfQuestions = await query("SELECT id::text,question_type FROM performance_review_questions WHERE performance_review_id=$1 AND relationship_type='SELF' ORDER BY sort_order", [reviewId]);
  const draft = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: { [selfQuestions[0].id]: 4 }, submit: false } });
  const draftRow = await query("SELECT status FROM review_assignments WHERE id=$1", [selfAssignment[0].id]);
  check("ANS-001", draft.response.status === 200 && draftRow[0].status === "DRAFT", `${draft.response.status}/${draftRow[0].status}`, "200/DRAFT");
  const incomplete = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: { [selfQuestions[0].id]: 4 }, submit: true } });
  check("ANS-004", incomplete.response.status === 400, incomplete.response.status, "submission rejected");
  const completeAnswers = { [selfQuestions[0].id]: 5, [selfQuestions[1].id]: "Complete essay" };
  const submitted = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: completeAnswers, submit: true } });
  const submittedRow = await query("SELECT status,submitted_at IS NOT NULL submitted FROM review_assignments WHERE id=$1", [selfAssignment[0].id]);
  check("ANS-005", submitted.response.status === 200 && submittedRow[0].status === "SUBMITTED" && submittedRow[0].submitted, JSON.stringify(submittedRow[0]), "SUBMITTED with timestamp");

  const invalidRating = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: { [selfQuestions[0].id]: 9 }, submit: false } });
  check("ANS-008", invalidRating.response.status === 400 && !String(invalidRating.data?.error).includes("chk_"), `${invalidRating.response.status}/${invalidRating.data?.error}`, "safe rejection");

  await request("/api/reviews", { cookie: admin.session, method: "PATCH", body: { id: reviewId, status: "IN_PROGRESS" } });
  let locked = false;
  try { await query("UPDATE performance_review_questions SET question_text='tampered' WHERE performance_review_id=$1", [reviewId]); } catch { locked = true; }
  check("REVQ-002", locked, locked, "database rejects IN_PROGRESS snapshot mutation");
  const templateTextBefore = await query("SELECT question_text FROM performance_review_questions WHERE performance_review_id=$1 AND relationship_type='SELF' ORDER BY sort_order LIMIT 1", [reviewId]);
  await query("UPDATE template_questions SET question_text='future changed' WHERE id=(SELECT tq.id FROM template_questions tq JOIN question_templates qt ON qt.id=tq.template_id WHERE qt.relationship_type='SELF' ORDER BY tq.sort_order LIMIT 1)");
  const templateTextAfter = await query("SELECT question_text FROM performance_review_questions WHERE performance_review_id=$1 AND relationship_type='SELF' ORDER BY sort_order LIMIT 1", [reviewId]);
  check("REV-012", templateTextBefore[0].question_text === templateTextAfter[0].question_text, templateTextAfter[0].question_text, templateTextBefore[0].question_text);

  await request("/api/reviews", { cookie: admin.session, method: "PATCH", body: { id: reviewId, status: "CLOSED" } });
  const userData = await request("/api/data", { cookie: userA.session });
  const incoming = userData.data?.data?.reviews?.flatMap(r => r.assignments).filter(a => a.revieweeId === ids.test_user_a && a.reviewerId !== ids.test_user_a) ?? [];
  check("ACL-006", incoming.every(a => String(a.reviewerId).startsWith("anonymous-")), JSON.stringify(incoming.map(a => a.reviewerId)), "all incoming reviewer IDs anonymized");
  const afterClose = await request("/api/answers", { cookie: userA.session, method: "PUT", body: { assignmentId: selfAssignment[0].id, answers: completeAnswers, submit: false } });
  check("TIME-005", afterClose.response.status === 400, afterClose.response.status, "closed review is read-only");

  const progress = await query("SELECT total_questions::int,answered_questions::int,completion_percentage::text FROM v_review_assignment_progress WHERE review_assignment_id=$1", [selfAssignment[0].id]);
  check("DB-PROGRESS", progress[0].total_questions === 2 && progress[0].answered_questions === 2, JSON.stringify(progress[0]), "2/2 answered");

  const failures = results.filter(r => !r.passed);
  console.log(JSON.stringify({ environment: "dedicated-system-test-database", total: results.length, passed: results.length - failures.length, failed: failures.length, results }, null, 2));
} finally {
  if (server) server.kill();
}
