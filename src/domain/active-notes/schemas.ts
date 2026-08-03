import { z } from "zod";

export const activeNoteAnalyzeRequestSchema = z.object({
  content: z
    .string({ error: "content is required" })
    .trim()
    .min(1, "content is required")
    .max(8000, "content must be at most 8000 characters"),
  projectId: z.string().trim().min(1).nullable().optional(),
});

export const activeNoteObjectTypeSchema = z.enum([
  "project",
  "task",
  "note",
  "decision",
  "idea",
  "person",
]);

export const activeNoteOperationTypeSchema = z.enum([
  "create",
  "suggest_create",
  "attach_context",
  "no_action",
]);

export const activeNoteRoutingDestinationSchema = z.enum([
  "existing_project",
  "new_project",
  "idea_only",
  "no_action",
]);

export const activeNoteImpactTypeSchema = z.enum([
  "task_context",
  "new_task",
  "project_context",
  "decision",
  "idea",
  "mixed",
]);

export const activeNoteRoutingSchema = z.object({
  destination: activeNoteRoutingDestinationSchema,
  projectId: z.string().nullable().optional(),
  relatedTaskId: z.string().nullable().optional(),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const activeNoteImpactSchema = z.object({
  type: activeNoteImpactTypeSchema,
  reason: z.string().min(1),
});

export const activeNoteSegmentSchema = z.object({
  ref: z.string().trim().min(1),
  text: z.string().trim().min(1),
  subject: z.string().trim().min(1),
});

export const activeNoteSegmentRouteSchema = z.object({
  segmentRef: z.string().trim().min(1),
  destination: activeNoteRoutingDestinationSchema,
  projectId: z.string().nullable().optional(),
  relatedTaskId: z.string().nullable().optional(),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  impact: activeNoteImpactSchema.nullable().optional(),
});

export const activeNoteProposalSchema = z.object({
  ref: z.string().trim().min(1),
  operationType: activeNoteOperationTypeSchema,
  objectType: activeNoteObjectTypeSchema,
  parent: z
    .object({
      projectId: z.string().nullable().optional(),
      projectRef: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  attachment: z
    .object({
      type: z.enum(["project", "task"]),
      id: z.string().nullable().optional(),
      ref: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  payload: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      content: z.string().optional(),
      rationale: z.string().optional(),
      name: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      dueDate: z.string().nullable().optional(),
    })
    .passthrough(),
  explicitlyStated: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
  reason: z.string().min(1),
  segmentRef: z.string().trim().min(1).nullable().optional(),
});

export const activeNoteAIOutputSchema = z.object({
  routing: activeNoteRoutingSchema,
  impact: activeNoteImpactSchema.nullable().optional(),
  summary: z.string().min(1),
  segments: z.array(activeNoteSegmentSchema).default([]),
  routes: z.array(activeNoteSegmentRouteSchema).default([]),
  proposals: z.array(activeNoteProposalSchema).default([]),
  candidateProjects: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        relevanceReason: z.string().optional(),
      })
    )
    .default([]),
  warnings: z.array(z.string()).default([]),
});

export type ParsedActiveNoteAnalyzeRequest = z.infer<
  typeof activeNoteAnalyzeRequestSchema
>;
export type ParsedActiveNoteAIOutput = z.infer<typeof activeNoteAIOutputSchema>;

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

export type ParsedActiveNoteApplyRequest = z.infer<
  typeof activeNoteApplyRequestSchema
>;
