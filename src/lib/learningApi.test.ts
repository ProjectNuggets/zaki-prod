import { learningUploadFileName } from "./learningApi";

describe("learning upload filenames", () => {
  it("preserves browser folder relative paths when available", () => {
    const file = new File(["hello"], "lesson.md", { type: "text/markdown" }) as File & {
      webkitRelativePath?: string;
    };
    Object.defineProperty(file, "webkitRelativePath", {
      value: "course/week-1/lesson.md",
    });

    expect(learningUploadFileName(file)).toBe("course/week-1/lesson.md");
  });

  it("falls back to the file name for normal uploads", () => {
    const file = new File(["hello"], "lesson.md", { type: "text/markdown" });

    expect(learningUploadFileName(file)).toBe("lesson.md");
  });
});
