import { z } from "zod";
import { activeNoteSegmentSchema } from "../../segmentation/schemas/index.js";

export const activeNoteAnalyzeRequestSchema = z.object({
  content: z
    .string({ error: "content is required" })
    .trim()
    .min(1, "content is required")
    .max(8000, "content must be at most 8000 characters"),
});

export const activeNoteAIOutputSchema = z.object({
  segments: z.array(activeNoteSegmentSchema).min(1),
  actionPlans: z.array(z.any()).min(0),
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
    description: z.string().optional(),
    content: z.string().optional(),
    rationale: z.string().optional(),
    name: z.string().optional(),
    priority: z.string().optional(),
    dueDate: z.string().nullable().optional(),
    status: z.string().optional(),
    projectId: z.string().nullable().optional(),
    subtype: z.string().nullable().optional(),
    sourceObjectId: z.string().nullable().optional(),
    sourceLabel: z.string().optional(),
    targetObjectId: z.string().optional(),
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
  activeNoteId: z.string().trim().min(1).optional(),
  content: z.string().max(8000).optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
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
        selectedProjectId: z.string().trim().min(1).nullable().optional(),
        projectRef: z.string().trim().min(1).nullable().optional(),
        duplicateResolution: z
          .enum(["attach_existing", "create_new", "ignore"])
          .nullable()
          .optional(),
        targetObjectId: z.string().trim().min(1).nullable().optional(),
        attachment: z
          .object({
            type: z.enum(["project", "task"]),
            id: z.string().nullable().optional(),
            ref: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .min(1, "operations are required"),
});
