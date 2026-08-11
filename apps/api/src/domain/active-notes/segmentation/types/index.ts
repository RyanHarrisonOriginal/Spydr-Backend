export interface ActiveNoteSegment {
  topic: string;
  sourceText: string;
  contextualText: string;
}

export interface ActiveNoteSegmentationResult {
  segments: ActiveNoteSegment[];
}
