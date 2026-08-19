export const ACTIVE_NOTE_PROJECT_DESTINATION_RESPONSE_SCHEMA = {
  name: "active_note_project_destination_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "originalText",
      "destination",
      "projectName",
      "matchBasis",
      "confidence",
      "reason",
    ],
    properties: {
      originalText: { type: "string" },
      destination: {
        type: "string",
        enum: ["new_project_candidate", "unassigned"],
      },
      projectName: {
        type: ["string", "null"],
      },
      matchBasis: {
        type: "string",
        enum: ["none"],
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
