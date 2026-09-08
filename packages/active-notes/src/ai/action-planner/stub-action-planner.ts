import type {
  ISegmentActionPlanner,
  PlanSegmentActionInput,
  SegmentActionPlan,
} from "../../domain/index.js";
import { inferStubSegmentActionPlan } from "./stub.js";

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class StubSegmentActionPlanner implements ISegmentActionPlanner {
  async plan(input: PlanSegmentActionInput): Promise<SegmentActionPlan> {
    await delay();
    return inferStubSegmentActionPlan(
      input.routedSegment,
      input.projectContext
    );
  }
}
