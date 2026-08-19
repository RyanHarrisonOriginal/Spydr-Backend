import type { ActiveNoteSegmentationResult } from "../types/index.js";

export interface IActiveNoteSegmenter {
  segment(content: string): Promise<ActiveNoteSegmentationResult>;
}
