export const ACTIVE_NOTE_PROJECT_RESOLVER_RESPONSE_SCHEMA = {
  name: "active_note_project_resolver_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "projectName", "matchBasis", "confidence", "reason"],
    properties: {
      projectId: { type: "string" },
      projectName: { type: "string" },
      matchBasis: {
        type: "string",
        enum: [
          "direct_project_reference",
          "existing_task",
          "existing_decision",
          "existing_idea",
          "existing_context",
          "project_scope",
        ],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      reason: { type: "string" },
    },
  },
} as const;
