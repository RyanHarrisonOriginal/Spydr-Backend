import { z } from "zod";

export const ACTIVE_NOTE_MAX_GENERATED_LABEL_LENGTH = 120;
export const ACTIVE_NOTE_MAX_GENERATED_LABEL_WORDS = 8;

const segmentIntentSchema = z.enum([
  "progress_update",
  "task_action",
  "decision",
  "idea",
  "project_context",
  "mixed",
]);

const plannedActionTypeSchema = z.enum([
  "create_task",
  "create_note",
  "attach_note_to_task",
  "create_decision",
  "create_idea",
  "use_existing_task",
]);

const confidenceSchema = z.number().min(0).max(1);
const reasonSchema = z.string().trim().min(1);

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validateGeneratedLabel(
  value: string,
  fieldName: string,
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  const trimmed = value.trim();
  if (!trimmed) {
    ctx.addIssue({
      code: "custom",
      message: `${fieldName} is required`,
      path,
    });
    return;
  }

  if (trimmed.length > ACTIVE_NOTE_MAX_GENERATED_LABEL_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: `${fieldName} is too long`,
      path,
    });
  }

  const words = countWords(trimmed);
  if (words > ACTIVE_NOTE_MAX_GENERATED_LABEL_WORDS) {
    ctx.addIssue({
      code: "custom",
      message: `${fieldName} should normally be 2–6 words`,
      path,
    });
  }
}

const createTaskPayloadSchema = z
  .object({
    title: z.string(),
    description: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    validateGeneratedLabel(value.title, "Task title", ctx, ["title"]);
  });

const createNotePayloadSchema = z.object({
  subject: z.string(),
  content: z.string().trim().min(1),
});

const attachNotePayloadSchema = z
  .object({
    subject: z.string(),
    content: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    validateGeneratedLabel(value.subject, "Note subject", ctx, ["subject"]);
  });

const createDecisionPayloadSchema = z
  .object({
    title: z.string(),
    rationale: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    validateGeneratedLabel(value.title, "Decision title", ctx, ["title"]);
  });

const createIdeaPayloadSchema = z
  .object({
    title: z.string(),
    description: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    validateGeneratedLabel(value.title, "Idea title", ctx, ["title"]);
  });

const segmentActionPlanActionSchema = z
  .object({
    type: plannedActionTypeSchema,
    confidence: confidenceSchema,
    reason: reasonSchema,
    targetTaskId: z.string().optional(),
    targetTaskTitle: z.string().optional(),
    payload: z
      .union([
        createTaskPayloadSchema,
        createNotePayloadSchema,
        attachNotePayloadSchema,
        createDecisionPayloadSchema,
        createIdeaPayloadSchema,
      ])
      .optional(),
  })
  .superRefine((value, ctx) => {
    switch (value.type) {
      case "create_task":
        if (!value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload is required for create_task",
            path: ["payload"],
          });
          return;
        }
        createTaskPayloadSchema.parse(value.payload);
        return;
      case "create_note": {
        if (!value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload is required for create_note",
            path: ["payload"],
          });
          return;
        }
        const notePayload = createNotePayloadSchema.parse(value.payload);
        validateGeneratedLabel(
          notePayload.subject,
          "Note subject",
          ctx,
          ["payload", "subject"]
        );
        return;
      }
      case "attach_note_to_task":
        if (!value.targetTaskId || !value.targetTaskTitle) {
          ctx.addIssue({
            code: "custom",
            message: "targetTaskId and targetTaskTitle are required",
            path: ["targetTaskId"],
          });
        }
        if (!value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload is required for attach_note_to_task",
            path: ["payload"],
          });
          return;
        }
        attachNotePayloadSchema.parse(value.payload);
        return;
      case "create_decision":
        if (!value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload is required for create_decision",
            path: ["payload"],
          });
          return;
        }
        createDecisionPayloadSchema.parse(value.payload);
        return;
      case "create_idea":
        if (!value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload is required for create_idea",
            path: ["payload"],
          });
          return;
        }
        createIdeaPayloadSchema.parse(value.payload);
        return;
      case "use_existing_task":
        if (!value.targetTaskId || !value.targetTaskTitle) {
          ctx.addIssue({
            code: "custom",
            message: "targetTaskId and targetTaskTitle are required",
            path: ["targetTaskId"],
          });
        }
        if (value.payload) {
          ctx.addIssue({
            code: "custom",
            message: "payload must not be set for use_existing_task",
            path: ["payload"],
          });
        }
    }
  });

export const segmentActionPlanSchema = z.object({
  originalText: z.string().min(1),
  projectId: z.string().trim().min(1),
  projectName: z.string().trim().min(1),
  intent: segmentIntentSchema,
  action: segmentActionPlanActionSchema,
});

export type ParsedSegmentActionPlanAction = z.infer<
  typeof segmentActionPlanActionSchema
>;
