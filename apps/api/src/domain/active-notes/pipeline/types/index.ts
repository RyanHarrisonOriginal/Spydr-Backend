import type { ActiveNoteSegment } from "../../segmentation/types/index.js";
import type { ActiveNotePipelineRecorder } from "./recorder.js";

export type { ActiveNotePipelineRecorder, ActiveNotePipelineStepName } from "./recorder.js";

export interface EmbeddedSegment extends ActiveNoteSegment {
  embedding: number[];
}

export interface ActiveNoteEmbeddedSegmentationResult {
  embeddedSegments: EmbeddedSegment[];
}
