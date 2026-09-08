import type {
  IActiveNoteSegmenter,
  ActiveNoteSegmentationResult,
} from "../../domain/index.js";

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class StubActiveNoteSegmenter implements IActiveNoteSegmenter {
  async segment(content: string): Promise<ActiveNoteSegmentationResult> {
    await delay();
    const trimmed = content.trim();
    return {
      segments: [
        {
          topic: "Active note",
          sourceText: trimmed,
          contextualText: trimmed,
        },
      ],
    };
  }
}
