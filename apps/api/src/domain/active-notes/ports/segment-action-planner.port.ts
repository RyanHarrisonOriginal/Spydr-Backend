import type {
  PlanSegmentActionInput,
  SegmentActionPlan,
} from "../types/index.js";

export interface ISegmentActionPlanner {
  plan(input: PlanSegmentActionInput): Promise<SegmentActionPlan>;
}
