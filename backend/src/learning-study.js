import crypto from "node:crypto";

const PROFILE_TEXT_LIMIT = 1200;
const PROFILE_SHORT_LIMIT = 240;
const TASK_STATUSES = new Set(["pending", "running", "done", "error", "skipped"]);
const TASK_KINDS = new Set([
  "study",
  "quiz",
  "review",
  "notebook",
  "practice",
  "book",
  "visualize",
  "flashcards",
]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "exam"]);
const PREFERRED_STYLES = new Set(["balanced", "simple", "deep", "exam", "visual", "practice"]);

function cleanText(value, limit = PROFILE_TEXT_LIMIT) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanDate(value) {
  const text = cleanText(value, 32);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) ? text : "";
}

export function normalizeLearningStudyProfile(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const difficulty = cleanText(source.difficulty, 32).toLowerCase();
  const preferredStyle = cleanText(source.preferredStyle ?? source.preferred_style, 32).toLowerCase();
  return {
    course: cleanText(source.course, PROFILE_SHORT_LIMIT),
    examDate: cleanDate(source.examDate ?? source.exam_date),
    topics: cleanText(source.topics, PROFILE_TEXT_LIMIT),
    goal: cleanText(source.goal, PROFILE_TEXT_LIMIT),
    weakTopics: cleanText(source.weakTopics ?? source.weak_topics, PROFILE_TEXT_LIMIT),
    weeklyHours: cleanText(source.weeklyHours ?? source.weekly_hours, 32),
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : "medium",
    preferredStyle: PREFERRED_STYLES.has(preferredStyle) ? preferredStyle : "balanced",
  };
}

export function studyProfileConfigured(profile = {}) {
  return Boolean(
    cleanText(profile.course) ||
      cleanText(profile.examDate) ||
      cleanText(profile.topics) ||
      cleanText(profile.goal) ||
      cleanText(profile.weakTopics)
  );
}

function parseHours(value) {
  const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(80, Math.max(1, Math.round(parsed)));
}

function buildTask(id, kind, title, description, source = {}) {
  return {
    id,
    kind: TASK_KINDS.has(kind) ? kind : "study",
    title,
    description,
    status: "pending",
    source,
  };
}

export function buildLearningStudyPlan(profileInput = {}, { nowDate = new Date() } = {}) {
  const profile = normalizeLearningStudyProfile(profileInput);
  const course = profile.course || "your course";
  const hours = parseHours(profile.weeklyHours);
  const focus = profile.weakTopics || profile.topics || profile.goal || course;
  const deadline = profile.examDate || "";
  const createdAt = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const title = profile.course ? `${profile.course} study plan` : "Personal study plan";
  const summary = [
    `Study ${course}`,
    deadline ? `deadline ${deadline}` : "",
    hours ? `${hours} hours/week` : "",
    profile.difficulty ? `${profile.difficulty} difficulty` : "",
    profile.preferredStyle && profile.preferredStyle !== "balanced" ? `${profile.preferredStyle} style` : "",
  ].filter(Boolean).join(" · ");

  const tasks = [
    buildTask(
      "task-foundation",
      "study",
      `Map the core ideas in ${course}`,
      `Create a concise topic map for ${profile.topics || course}, then mark what is already strong and what needs review.`,
      { route: "chat", capability: "chat" }
    ),
    buildTask(
      "task-weak-topics",
      "practice",
      `Practice weak topics: ${focus}`,
      "Work through one similar problem at a time. Try first, then compare against a step-by-step solution.",
      { route: "solve", capability: "deep_solve", weakTopics: profile.weakTopics }
    ),
    buildTask(
      "task-quiz",
      "quiz",
      `Generate a checkpoint quiz for ${course}`,
      "Create answer-keyed questions with explanations and track wrong answers into review.",
      { route: "quiz", capability: "deep_question", difficulty: profile.difficulty }
    ),
    buildTask(
      "task-notebook",
      "notebook",
      "Save the strongest explanations to a notebook",
      "Turn the best answer from each session into durable notes, summaries, and later review material.",
      { route: "notebooks" }
    ),
  ];

  if (profile.preferredStyle === "visual" || profile.topics || profile.weakTopics) {
    tasks.push(
      buildTask(
        "task-visual",
        "visualize",
        "Visualize the hardest concept",
        "Create one diagram or animation for the concept that is hardest to hold mentally.",
        { route: "visualize", capability: "visualize" }
      )
    );
  }

  if (deadline) {
    tasks.push(
      buildTask(
        "task-final-review",
        "review",
        "Final weak-topic review",
        "Review wrong answers, notebook summaries, and unresolved weak topics before the deadline.",
        { route: "review", deadline }
      )
    );
  }

  return {
    title,
    summary,
    createdAt,
    profile,
    milestones: [
      {
        id: "milestone-understand",
        title: "Understand",
        description: "Build clean explanations and examples.",
        taskIds: ["task-foundation", "task-visual"].filter((id) => tasks.some((task) => task.id === id)),
      },
      {
        id: "milestone-practice",
        title: "Practice",
        description: "Convert weak areas into solved problems.",
        taskIds: ["task-weak-topics", "task-quiz"],
      },
      {
        id: "milestone-retain",
        title: "Retain",
        description: "Save notes and review before the exam.",
        taskIds: ["task-notebook", "task-final-review"].filter((id) => tasks.some((task) => task.id === id)),
      },
    ],
    tasks,
  };
}

function rowToProfile(row) {
  return normalizeLearningStudyProfile(row?.profile_json || {});
}

function rowToPlan(row, tasks = []) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    profile: normalizeLearningStudyProfile(row.profile_json || {}),
    plan: row.plan_json || {},
    tasks,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function rowToTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    planId: row.plan_id,
    kind: row.kind,
    title: row.title,
    description: row.description || "",
    status: row.status,
    source: row.source_json || {},
    dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

export async function getLearningStudyState({ dbQuery, userId }) {
  const profileResult = await dbQuery(
    `SELECT profile_json, updated_at
     FROM zaki_learning_study_profiles
     WHERE user_id = $1`,
    [userId]
  );
  const planResult = await dbQuery(
    `SELECT id, title, status, profile_json, plan_json, created_at, updated_at
     FROM zaki_learning_study_plans
     WHERE user_id = $1 AND status = 'active'
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [userId]
  );
  const planRow = planResult.rows?.[0] || null;
  const taskResult = planRow
    ? await dbQuery(
        `SELECT id, plan_id, kind, title, description, status, source_json, due_at, completed_at, created_at, updated_at
         FROM zaki_learning_study_tasks
         WHERE user_id = $1 AND plan_id = $2
         ORDER BY created_at ASC, id ASC`,
        [userId, planRow.id]
      )
    : { rows: [] };
  return {
    profile: rowToProfile(profileResult.rows?.[0]),
    plan: rowToPlan(planRow, (taskResult.rows || []).map(rowToTask).filter(Boolean)),
  };
}

export async function upsertLearningStudyProfile({ dbQuery, userId, profile }) {
  const normalized = normalizeLearningStudyProfile(profile);
  const result = await dbQuery(
    `INSERT INTO zaki_learning_study_profiles (user_id, profile_json, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET profile_json = EXCLUDED.profile_json, updated_at = NOW()
     RETURNING profile_json, updated_at`,
    [userId, JSON.stringify(normalized)]
  );
  return {
    profile: rowToProfile(result.rows?.[0]),
    configured: studyProfileConfigured(normalized),
  };
}

async function insertLearningStudyPlan({ dbQuery, userId, profile, nowDate }) {
  const normalized = normalizeLearningStudyProfile(profile);
  const generated = buildLearningStudyPlan(normalized, { nowDate });
  const planId = crypto.randomUUID();

  await dbQuery(
    `INSERT INTO zaki_learning_study_profiles (user_id, profile_json, created_at, updated_at)
     VALUES ($1, $2::jsonb, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET profile_json = EXCLUDED.profile_json, updated_at = NOW()`,
    [userId, JSON.stringify(normalized)]
  );
  await dbQuery(
    `UPDATE zaki_learning_study_plans
     SET status = 'archived', updated_at = NOW()
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  const planResult = await dbQuery(
    `INSERT INTO zaki_learning_study_plans
      (id, user_id, title, status, profile_json, plan_json, created_at, updated_at)
     VALUES ($1, $2, $3, 'active', $4::jsonb, $5::jsonb, NOW(), NOW())
     RETURNING id, title, status, profile_json, plan_json, created_at, updated_at`,
    [planId, userId, generated.title, JSON.stringify(normalized), JSON.stringify(generated)]
  );
  const insertedTasks = [];
  for (const task of generated.tasks) {
    const taskResult = await dbQuery(
      `INSERT INTO zaki_learning_study_tasks
        (id, plan_id, user_id, kind, title, description, status, source_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb, NOW(), NOW())
       RETURNING id, plan_id, kind, title, description, status, source_json, due_at, completed_at, created_at, updated_at`,
      [
        `${planId}:${task.id}`,
        planId,
        userId,
        task.kind,
        task.title,
        task.description,
        JSON.stringify(task.source || {}),
      ]
    );
    insertedTasks.push(rowToTask(taskResult.rows?.[0]));
  }
  return {
    profile: normalized,
    plan: rowToPlan(planResult.rows?.[0], insertedTasks.filter(Boolean)),
  };
}

export async function createLearningStudyPlan({
  dbQuery,
  withTransaction,
  userId,
  profile,
  nowDate = new Date(),
}) {
  if (typeof withTransaction === "function") {
    return withTransaction((client) =>
      insertLearningStudyPlan({
        dbQuery: (text, params = []) => client.query(text, params),
        userId,
        profile,
        nowDate,
      })
    );
  }
  return insertLearningStudyPlan({ dbQuery, userId, profile, nowDate });
}

export async function updateLearningStudyTask({ dbQuery, userId, taskId, patch }) {
  const rawStatus = cleanText(patch?.status, 32).toLowerCase();
  const status = TASK_STATUSES.has(rawStatus) ? rawStatus : null;
  const title = patch?.title === undefined ? null : cleanText(patch.title, PROFILE_SHORT_LIMIT);
  const completedAt = status === "done" ? new Date().toISOString() : null;
  const result = await dbQuery(
    `UPDATE zaki_learning_study_tasks
     SET
       status = COALESCE($3, status),
       title = COALESCE(NULLIF($4, ''), title),
       completed_at = CASE
         WHEN $3 = 'done' THEN COALESCE(completed_at, $5::timestamptz)
         WHEN $3 IS NOT NULL AND $3 <> 'done' THEN NULL
         ELSE completed_at
       END,
       updated_at = NOW()
     WHERE user_id = $1 AND id = $2
     RETURNING id, plan_id, kind, title, description, status, source_json, due_at, completed_at, created_at, updated_at`,
    [userId, taskId, status, title, completedAt]
  );
  return rowToTask(result.rows?.[0]);
}

export async function completeLearningStudyTask({ dbQuery, userId, taskId }) {
  return updateLearningStudyTask({
    dbQuery,
    userId,
    taskId,
    patch: { status: "done" },
  });
}
