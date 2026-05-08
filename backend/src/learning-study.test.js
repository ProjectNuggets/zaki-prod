import { jest } from "@jest/globals";
import {
  buildLearningStudyPlan,
  createLearningStudyPlan,
  normalizeLearningStudyProfile,
  studyProfileConfigured,
  updateLearningStudyTask,
} from "./learning-study.js";

describe("learning study state", () => {
  test("normalizes hosted study profile fields", () => {
    expect(
      normalizeLearningStudyProfile({
        course: "  Calculus II  ",
        exam_date: "2026-06-15",
        topics: "limits\n derivatives",
        weak_topics: "series",
        weekly_hours: "6",
        difficulty: "HARD",
        preferred_style: "PRACTICE",
        api_key: "must-not-matter",
      })
    ).toEqual({
      course: "Calculus II",
      examDate: "2026-06-15",
      topics: "limits derivatives",
      goal: "",
      weakTopics: "series",
      weeklyHours: "6",
      difficulty: "hard",
      preferredStyle: "practice",
    });
  });

  test("builds durable plan tasks from profile", () => {
    const plan = buildLearningStudyPlan(
      {
        course: "Physics",
        topics: "energy, momentum",
        weakTopics: "work-energy theorem",
        weeklyHours: "5",
        difficulty: "exam",
        preferredStyle: "visual",
      },
      { nowDate: new Date("2026-05-08T00:00:00.000Z") }
    );

    expect(plan.title).toBe("Physics study plan");
    expect(plan.summary).toContain("5 hours/week");
    expect(plan.tasks.map((task) => task.kind)).toEqual(
      expect.arrayContaining(["study", "practice", "quiz", "notebook", "visualize"])
    );
    expect(plan.tasks.find((task) => task.kind === "quiz")?.source).toMatchObject({
      capability: "deep_question",
      difficulty: "exam",
    });
  });

  test("detects configured profile using course, topics, goal, deadline, or weak areas", () => {
    expect(studyProfileConfigured(normalizeLearningStudyProfile({}))).toBe(false);
    expect(studyProfileConfigured(normalizeLearningStudyProfile({ topics: "linear algebra" }))).toBe(true);
  });

  test("updates tasks only for the current user", async () => {
    const dbQuery = jest.fn(async (_sql, params) => ({
      rows: [
        {
          id: params[1],
          plan_id: "plan-1",
          kind: "quiz",
          title: params[3] || "Quiz",
          description: "Checkpoint",
          status: params[2] || "pending",
          source_json: { route: "quiz" },
          due_at: null,
          completed_at: params[4] || null,
          created_at: "2026-05-08T00:00:00.000Z",
          updated_at: "2026-05-08T00:00:00.000Z",
        },
      ],
    }));

    const task = await updateLearningStudyTask({
      dbQuery,
      userId: 57,
      taskId: "task-1",
      patch: { status: "done", title: "Final quiz" },
    });

    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1 AND id = $2"), [
      57,
      "task-1",
      "done",
      "Final quiz",
      expect.any(String),
    ]);
    expect(task).toMatchObject({
      id: "task-1",
      status: "done",
      title: "Final quiz",
      source: { route: "quiz" },
    });
  });

  test("creates plans through the supplied transaction helper", async () => {
    const txQuery = jest.fn(async (sql, params = []) => {
      if (String(sql).startsWith("INSERT INTO zaki_learning_study_plans")) {
        return {
          rows: [
            {
              id: params[0],
              title: params[2],
              status: "active",
              profile_json: JSON.parse(params[3]),
              plan_json: JSON.parse(params[4]),
              created_at: "2026-05-08T00:00:00.000Z",
              updated_at: "2026-05-08T00:00:00.000Z",
            },
          ],
        };
      }
      if (String(sql).startsWith("INSERT INTO zaki_learning_study_tasks")) {
        return {
          rows: [
            {
              id: params[0],
              plan_id: params[1],
              kind: params[3],
              title: params[4],
              description: params[5],
              status: "pending",
              source_json: JSON.parse(params[6]),
              due_at: null,
              completed_at: null,
              created_at: "2026-05-08T00:00:00.000Z",
              updated_at: "2026-05-08T00:00:00.000Z",
            },
          ],
        };
      }
      return { rows: [] };
    });
    const client = { query: txQuery };
    const withTransaction = jest.fn((callback) => callback(client));
    const dbQuery = jest.fn();

    const result = await createLearningStudyPlan({
      dbQuery,
      withTransaction,
      userId: 57,
      profile: { course: "Biology" },
      nowDate: new Date("2026-05-08T00:00:00.000Z"),
    });

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(dbQuery).not.toHaveBeenCalled();
    expect(result.plan.title).toBe("Biology study plan");
    expect(result.plan.tasks.length).toBeGreaterThan(0);
  });
});
