import { z } from "zod";

export const projectMatchBasisSchema = z.enum([
  "direct_project_reference",
  "existing_task",
  "existing_decision",
  "existing_idea",
  "existing_context",
  "project_scope",
  "none",
]);

export const activeNoteProjectAssignmentSchema = z
  .object({
    originalText: z.string().min(1),
    destination: z.enum([
      "existing_project",
      "new_project_candidate",
      "unassigned",
    ]),
    projectId: z.string().nullable(),
    projectName: z.string().nullable(),
    matchBasis: projectMatchBasisSchema,
    confidence: z.number().min(0).max(1),
    reason: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.destination === "existing_project") {
      if (!value.projectId) {
        ctx.addIssue({
          code: "custom",
          message: "projectId is required for existing_project",
          path: ["projectId"],
        });
      }
      if (!value.projectName) {
        ctx.addIssue({
          code: "custom",
          message: "projectName is required for existing_project",
          path: ["projectName"],
        });
      }
      if (value.matchBasis === "none") {
        ctx.addIssue({
          code: "custom",
          message: "matchBasis cannot be none for existing_project",
          path: ["matchBasis"],
        });
      }
      return;
    }

    if (value.destination === "new_project_candidate") {
      if (value.projectId !== null) {
        ctx.addIssue({
          code: "custom",
          message: "projectId must be null for new_project_candidate",
          path: ["projectId"],
        });
      }
      if (!value.projectName) {
        ctx.addIssue({
          code: "custom",
          message: "projectName is required for new_project_candidate",
          path: ["projectName"],
        });
      }
      if (value.matchBasis !== "none") {
        ctx.addIssue({
          code: "custom",
          message: "matchBasis must be none for new_project_candidate",
          path: ["matchBasis"],
        });
      }
      return;
    }

    if (value.projectId !== null) {
      ctx.addIssue({
        code: "custom",
        message: "projectId must be null for unassigned",
        path: ["projectId"],
      });
    }
    if (value.projectName !== null) {
      ctx.addIssue({
        code: "custom",
        message: "projectName must be null for unassigned",
        path: ["projectName"],
      });
    }
    if (value.matchBasis !== "none") {
      ctx.addIssue({
        code: "custom",
        message: "matchBasis must be none for unassigned",
        path: ["matchBasis"],
      });
    }
  });

export const projectFitVerdictSchema = z.enum([
  "match",
  "no_match",
  "insufficient_evidence",
]);

export const projectResolutionResultSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  matchBasis: projectMatchBasisSchema.exclude(["none"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1),
});

export const projectFitEvaluationSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  verdict: projectFitVerdictSchema,
  matchBasis: projectMatchBasisSchema,
  confidence: z.number().min(0).max(1),
  segmentEvidence: z.string().nullable().optional(),
  projectEvidence: z.string().nullable().optional(),
  targetObjectId: z.string().nullable().optional(),
  targetObjectTitle: z.string().nullable().optional(),
  reason: z.string().trim().min(1),
});

export const projectDestinationSchema = z
  .object({
    originalText: z.string().min(1),
    destination: z.enum(["new_project_candidate", "unassigned"]),
    projectName: z.string().nullable(),
    matchBasis: z.literal("none"),
    confidence: z.number().min(0).max(1),
    reason: z.string().trim().min(1),
  })
  .superRefine((value, ctx) => {
    if (value.destination === "new_project_candidate") {
      if (!value.projectName) {
        ctx.addIssue({
          code: "custom",
          message: "projectName is required for new_project_candidate",
          path: ["projectName"],
        });
      }
      return;
    }

    if (value.projectName !== null) {
      ctx.addIssue({
        code: "custom",
        message: "projectName must be null for unassigned",
        path: ["projectName"],
      });
    }
  });
