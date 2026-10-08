import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  getProjectsInputSchema,
  getTasksInputSchema,
} from "./list-view-input.js";

function advertisedProperties(schema: z.ZodType) {
  const json = z.toJSONSchema(schema, { target: "draft-07" }) as {
    properties?: Record<string, { type?: string }>;
  };
  return json.properties ?? {};
}

describe("list-view-input schemas", () => {
  it.each([
    ["get_projects", getProjectsInputSchema],
    ["get_tasks", getTasksInputSchema],
  ] as const)(
    "%s tools/list JSON Schema includes filters and pagination",
    (_name, schema) => {
      const props = advertisedProperties(schema);
      expect(Object.keys(props).sort()).toEqual(
        ["assignee", "id", "limit", "offset", "orgId", "status"].sort()
      );
      expect(props.limit?.type).toBe("integer");
      expect(props.offset?.type).toBe("integer");
      expect(props.status?.type).toBe("string");
      expect(props.assignee?.type).toBe("string");
    }
  );

  it("coerces string limit/offset from clients without typed schema", () => {
    const parsed = getTasksInputSchema.safeParse({
      limit: "100",
      offset: "20",
      status: "active",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(100);
      expect(parsed.data.offset).toBe(20);
      expect(parsed.data.status).toBe("active");
    }
  });

  it("still accepts numeric limit/offset", () => {
    const parsed = getProjectsInputSchema.safeParse({
      limit: 50,
      offset: 0,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(50);
      expect(parsed.data.offset).toBe(0);
    }
  });
});
