export const ACTIVE_NOTE_PROJECT_FIT_RESPONSE_SCHEMA = {
  name: "active_note_project_fit_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "projectId",
      "projectName",
      "verdict",
      "matchBasis",
      "confidence",
      "segmentEvidence",
      "projectEvidence",
      "targetObjectId",
      "targetObjectTitle",
      "reason",
    ],
    properties: {
      projectId: { type: "string" },
      projectName: { type: "string" },
      verdict: {
        type: "string",
        enum: ["match", "no_match", "insufficient_evidence"],
      },
      matchBasis: {
        type: "string",
        enum: [
          "direct_project_reference",
          "existing_task",
          "existing_decision",
          "existing_idea",
          "existing_context",
          "project_scope",
          "none",
        ],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      segmentEvidence: {
        type: ["string", "null"],
      },
      projectEvidence: {
        type: ["string", "null"],
      },
      targetObjectId: {
        type: ["string", "null"],
      },
      targetObjectTitle: {
        type: ["string", "null"],
      },
      reason: { type: "string" },
    },
  },
} as const;
