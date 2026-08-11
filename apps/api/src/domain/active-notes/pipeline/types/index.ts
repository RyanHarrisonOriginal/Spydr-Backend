import type { ActiveNoteSegment } from "../../segmentation/types/index.js";

export interface EmbeddedSegment extends ActiveNoteSegment {
  embedding: number[];
}

export interface ActiveNoteEmbeddedSegmentationResult {
  embeddedSegments: EmbeddedSegment[];
}
