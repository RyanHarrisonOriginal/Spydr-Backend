import type { IEmbeddingPort } from "./embedding.port.js";
import type { IProjectSearchPort } from "./project-search.port.js";
import type { IProjectActionContextPort } from "./project-action-context.port.js";
import type { IActiveNoteSegmenter } from "./segmenter.port.js";
import type { IProjectAssignmentPort } from "./project-assignment.port.js";
import type { ISegmentActionPlanner } from "./segment-action-planner.port.js";

export interface AnalyzeActiveNotePorts {
  embedding: IEmbeddingPort;
  projectSearch: IProjectSearchPort;
  projectActionContext: IProjectActionContextPort;
  segmenter: IActiveNoteSegmenter;
  projectAssignment: IProjectAssignmentPort;
  actionPlanner: ISegmentActionPlanner;
}
