export const ACTIVE_NOTE_RESPONSE_SCHEMA = {
  name: "active_note_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "routing",
      "impact",
      "summary",
      "segments",
      "routes",
      "proposals",
      "candidateProjects",
      "warnings",
    ],
    properties: {
      routing: {
        type: "object",
        additionalProperties: false,
        required: [
          "destination",
          "projectId",
          "relatedTaskId",
          "reason",
          "confidence",
        ],
        properties: {
          destination: {
            type: "string",
            enum: [
              "existing_project",
              "new_project",
              "idea_only",
              "no_action",
            ],
          },
          projectId: { type: ["string", "null"] },
          relatedTaskId: { type: ["string", "null"] },
          reason: { type: "string" },
          confidence: { type: "number" },
        },
      },
      impact: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "reason"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "task_context",
                  "new_task",
                  "project_context",
                  "decision",
                  "idea",
                  "mixed",
                ],
              },
              reason: { type: "string" },
            },
          },
          { type: "null" },
        ],
      },
      summary: { type: "string" },
      segments: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["ref", "text", "subject"],
          properties: {
            ref: { type: "string" },
            text: { type: "string" },
            subject: { type: "string" },
          },
        },
      },
      routes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "segmentRef",
            "destination",
            "projectId",
            "relatedTaskId",
            "reason",
            "confidence",
            "impact",
          ],
          properties: {
            segmentRef: { type: "string" },
            destination: {
              type: "string",
              enum: [
                "existing_project",
                "new_project",
                "idea_only",
                "no_action",
              ],
            },
            projectId: { type: ["string", "null"] },
            relatedTaskId: { type: ["string", "null"] },
            reason: { type: "string" },
            confidence: { type: "number" },
            impact: {
              anyOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["type", "reason"],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "task_context",
                        "new_task",
                        "project_context",
                        "decision",
                        "idea",
                        "mixed",
                      ],
                    },
                    reason: { type: "string" },
                  },
                },
                { type: "null" },
              ],
            },
          },
        },
      },
      proposals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "ref",
            "operationType",
            "objectType",
            "parent",
            "attachment",
            "payload",
            "explicitlyStated",
            "confidence",
            "evidence",
            "reason",
            "segmentRef",
          ],
          properties: {
            ref: { type: "string" },
            operationType: {
              type: "string",
              enum: [
                "create",
                "suggest_create",
                "attach_context",
                "no_action",
              ],
            },
            objectType: {
              type: "string",
              enum: ["project", "task", "note", "decision", "idea", "person"],
            },
            parent: {
              anyOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["projectId", "projectRef"],
                  properties: {
                    projectId: { type: ["string", "null"] },
                    projectRef: { type: ["string", "null"] },
                  },
                },
                { type: "null" },
              ],
            },
            attachment: {
              anyOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["type", "id", "ref"],
                  properties: {
                    type: { type: "string", enum: ["project", "task"] },
                    id: { type: ["string", "null"] },
                    ref: { type: ["string", "null"] },
                  },
                },
                { type: "null" },
              ],
            },
            payload: {
              type: "object",
              additionalProperties: false,
              required: [
                "title",
                "description",
                "content",
                "rationale",
                "name",
                "priority",
                "dueDate",
              ],
              properties: {
                title: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                content: { type: ["string", "null"] },
                rationale: { type: ["string", "null"] },
                name: { type: ["string", "null"] },
                priority: {
                  type: ["string", "null"],
                  enum: ["low", "medium", "high", null],
                },
                dueDate: { type: ["string", "null"] },
              },
            },
            explicitlyStated: { type: "boolean" },
            confidence: { type: "number" },
            evidence: {
              type: "array",
              items: { type: "string" },
            },
            reason: { type: "string" },
            segmentRef: { type: ["string", "null"] },
          },
        },
      },
      candidateProjects: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "relevanceReason"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            relevanceReason: { type: ["string", "null"] },
          },
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;
