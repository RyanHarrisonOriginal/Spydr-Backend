export const ACTIVE_NOTE_SEGMENTATION_RESPONSE_SCHEMA = {
  name: "active_note_segmentation_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["segments"],
    properties: {
      segments: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["topic", "sourceText", "contextualText"],
          properties: {
            topic: { type: "string" },
            sourceText: { type: "string" },
            contextualText: { type: "string" },
          },
        },
      },
    },
  },
} as const;
