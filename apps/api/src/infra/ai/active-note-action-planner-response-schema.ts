export const ACTIVE_NOTE_ACTION_PLANNER_RESPONSE_SCHEMA = {
  name: "active_note_action_planner_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "originalText",
      "projectId",
      "projectName",
      "intent",
      "action",
    ],
    properties: {
      originalText: { type: "string" },
      projectId: { type: "string" },
      projectName: { type: "string" },
      intent: {
        type: "string",
        enum: [
          "progress_update",
          "task_action",
          "decision",
          "idea",
          "project_context",
          "mixed",
        ],
      },
      action: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "confidence",
          "reason",
          "targetTaskId",
          "targetTaskTitle",
          "payload",
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "create_task",
              "create_note",
              "attach_note_to_task",
              "create_decision",
              "create_idea",
              "use_existing_task",
            ],
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          reason: { type: "string" },
          targetTaskId: { type: ["string", "null"] },
          targetTaskTitle: { type: ["string", "null"] },
          payload: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: [
                  "title",
                  "description",
                  "subject",
                  "content",
                  "rationale",
                ],
                properties: {
                  title: { type: ["string", "null"] },
                  description: { type: ["string", "null"] },
                  subject: { type: ["string", "null"] },
                  content: { type: ["string", "null"] },
                  rationale: { type: ["string", "null"] },
                },
              },
            ],
          },
        },
      },
    },
  },
} as const;
