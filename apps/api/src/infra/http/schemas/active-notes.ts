import { z } from "zod";

export const activeNoteAnalyzeRequestSchema = z.object({
  content: z
    .string({ error: "content is required" })
    .trim()
    .min(1, "content is required")
    .max(8000, "content must be at most 8000 characters"),
});

/** Frontend often sends "" for unset IDs; coerce those to null instead of 400. */
const optionalNullableId = z
  .string()
  .nullable()
  .optional()
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const applyPayloadSchema = z
  .object({
    kind: z.enum([
      "project",
      "task",
      "note",
      "goal",
      "decision",
      "idea",
      "person",
      "link",
      "no_action",
    ]),
    title: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    rationale: z.string().optional(),
    name: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().nullable().optional(),
    status: z.string().optional(),
    projectId: optionalNullableId,
    subtype: z.string().nullable().optional(),
    sourceObjectId: optionalNullableId,
    sourceLabel: z.string().optional(),
    targetObjectId: optionalNullableId,
    targetLabel: z.string().optional(),
    targetObjectType: z
      .enum([
        "project",
        "task",
        "note",
        "goal",
        "decision",
        "idea",
        "person",
        "relationship",
      ])
      .optional(),
    relationshipType: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();

export const activeNoteApplyRequestSchema = z.object({
  activeNoteId: optionalNullableId,
  content: z.string().max(8000).optional(),
  projectId: optionalNullableId,
  operations: z
    .array(
      z.object({
        operationId: z.string().trim().min(1),
        selected: z.boolean(),
        objectType: z
          .enum([
            "project",
            "task",
            "note",
            "goal",
            "decision",
            "idea",
            "person",
            "relationship",
          ])
          .nullable()
          .optional(),
        payload: applyPayloadSchema,
        selectedProjectId: optionalNullableId,
        projectRef: optionalNullableId,
        duplicateResolution: z
          .enum(["attach_existing", "create_new", "ignore"])
          .nullable()
          .optional(),
        targetObjectId: optionalNullableId,
        attachment: z
          .object({
            type: z.enum(["project", "task"]),
            id: optionalNullableId,
            ref: optionalNullableId,
          })
          .nullable()
          .optional(),
      })
    )
    .min(1, "operations are required"),
});

export function formatActiveNoteRequestError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.filter((part) => part !== undefined).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
