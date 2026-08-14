import { z } from "zod";

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
const requiredTextSchema = z.string().trim().min(1);

const createTaskPayloadSchema = z.object({
  title: requiredTextSchema,
  description: z.string().nullable().optional(),
});

const createNotePayloadSchema = z.object({
  subject: requiredTextSchema,
  content: z.string().trim().min(1),
});

const attachNotePayloadSchema = z.object({
  subject: requiredTextSchema,
  content: z.string().trim().min(1),
});

const createDecisionPayloadSchema = z.object({
  title: requiredTextSchema,
  rationale: z.string().nullable().optional(),
});

const createIdeaPayloadSchema = z.object({
  title: requiredTextSchema,
  description: z.string().nullable().optional(),
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
        createNotePayloadSchema.parse(value.payload);
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
