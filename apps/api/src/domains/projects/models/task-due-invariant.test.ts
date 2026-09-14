import { describe, expect, it } from "vitest";
import {
  assertProjectTargetCoversTaskDues,
  assertTaskDueDateWithinProjectTarget,
  isDueAfterProjectTarget,
} from "./task-due-invariant.js";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("task due vs project target invariant", () => {
  it("allows a due date on or before the project target", () => {
    expect(isDueAfterProjectTarget(day("2026-09-20"), day("2026-09-20"))).toBe(
      false
    );
    expect(isDueAfterProjectTarget(day("2026-09-19"), day("2026-09-20"))).toBe(
      false
    );
    expect(() =>
      assertTaskDueDateWithinProjectTarget(day("2026-09-20"), day("2026-09-20"))
    ).not.toThrow();
  });

  it("rejects a due date after the project target", () => {
    expect(isDueAfterProjectTarget(day("2026-09-21"), day("2026-09-20"))).toBe(
      true
    );
    expect(() =>
      assertTaskDueDateWithinProjectTarget(day("2026-09-21"), day("2026-09-20"))
    ).toThrow(
      "Invalid task due date: cannot be after the project target date (2026-09-20)"
    );
  });

  it("allows any due date when the project has no target", () => {
    expect(isDueAfterProjectTarget(day("2026-12-01"), null)).toBe(false);
    expect(() =>
      assertTaskDueDateWithinProjectTarget(day("2026-12-01"), null)
    ).not.toThrow();
  });

  it("rejects shrinking a project before an open task is due", () => {
    expect(() =>
      assertProjectTargetCoversTaskDues(day("2026-09-10"), [
        { details: { dueDate: day("2026-09-20") } },
      ])
    ).toThrow("Invalid project date: cannot end before a task is due (2026-09-20)");
  });

  it("ignores deleted tasks when shrinking a project", () => {
    expect(() =>
      assertProjectTargetCoversTaskDues(day("2026-09-10"), [
        { isDeleted: true, details: { dueDate: day("2026-09-20") } },
      ])
    ).not.toThrow();
  });
});
