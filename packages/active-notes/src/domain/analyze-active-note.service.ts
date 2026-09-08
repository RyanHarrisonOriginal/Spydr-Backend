import { generateSegmentEmbeddings } from "./generate-segment-embeddings.js";
import { searchSegmentProjectMatches } from "./search-segment-project-matches.js";
import { inferSegmentProjectAssignmentsFromFitEvaluations } from "./infer-segment-project-assignment.js";
import {
  isExistingProjectRoutedSegment,
  isNewProjectCandidateRoutedSegment,
  isUnassignedRoutedSegment,
} from "./classify-routed-segment.js";
import { buildNewProjectCandidateActionPlan } from "./build-new-project-candidate-action-plan.js";
import { buildUnassignedActionPlan } from "./build-unassigned-action-plan.js";
import { attachSegmentLineageToActionPlan } from "./attach-segment-lineage-to-action-plan.js";
import { setTaskIdForAttachNoteAction } from "./set-task-id-for-attach-note-action.js";
import { buildActiveNoteOutput } from "./build-active-note-output.js";
import { ProjectRetrievalError } from "./search-projects.js";
import {
  ActiveNoteAnalysisError,
  type ActiveNoteAIInput,
  type ActiveNoteAIOutput,
  type ActiveNoteRequestContext,
  type SegmentWithOptionalActionPlan,
  type SegmentWithProjectAssignment,
} from "./types/index.js";
import type { AnalyzeActiveNotePorts } from "./ports/analyze-active-note.ports.js";
import { ProjectActionContextError } from "./ports/project-action-context.port.js";

const ACTIVE_NOTE_ANALYSIS_FAILURE_MESSAGE =
  "Active note analysis failed. Please try again.";

type ErrorConstructor = abstract new (...args: never[]) => Error;

export class AnalyzeActiveNoteService {
  constructor(private readonly ports: AnalyzeActiveNotePorts) {}

  async analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    const context: ActiveNoteRequestContext = {
      orgId: input.orgId,
      userId: input.userId,
    };
    const recorder = input.recorder;
    let currentStep = "segment";

    try {
      const segmented = await this.ports.segmenter.segment(input.content);
      await recorder?.recordStep("segment", {
        segments: segmented.segments,
      });

      currentStep = "embed";
      const embeddedSegments = await this.runPipelineStep(
        () =>
          generateSegmentEmbeddings(
            segmented.segments,
            (text) => this.ports.embedding.embed(text)
          ),
        { recoverableErrors: [] }
      );

      currentStep = "project_context";
      const withContext = await this.runPipelineStep(
        async () => ({
          embeddedSegments: await searchSegmentProjectMatches(
            embeddedSegments,
            this.ports.projectSearch,
            context.orgId
          ),
        }),
        {
          recoverableErrors: [ProjectRetrievalError],
          rethrowUnknown: true,
        }
      );
      await recorder?.recordStep("project_context", withContext);

      currentStep = "project_assignment";
      const withAssignment = {
        embeddedSegments: await inferSegmentProjectAssignmentsFromFitEvaluations(
          withContext.embeddedSegments,
          this.ports.projectAssignment
        ),
      };
      await recorder?.recordStep("project_assignment", withAssignment);

      currentStep = "action_plan";
      const output = await this.runPipelineStep(
        () => this.planActions(withAssignment),
        { recoverableErrors: [ProjectActionContextError] }
      );
      await recorder?.recordStep("action_plan", output);

      return output;
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error(String(error));
      try {
        await recorder?.recordFailure(currentStep, failure);
      } catch (persistError) {
        console.error("[active-note.session] failed to persist step failure", {
          step: currentStep,
          persistError,
        });
      }
      throw error;
    }
  }

  async planActions(result: {
    embeddedSegments: SegmentWithProjectAssignment[];
  }): Promise<ActiveNoteAIOutput> {
    const plannedSegments = await Promise.all(
      result.embeddedSegments.map((segment) => this.inferSegmentAction(segment))
    );
    return buildActiveNoteOutput({ embeddedSegments: plannedSegments });
  }

  private async inferSegmentAction(
    segment: SegmentWithProjectAssignment
  ): Promise<SegmentWithOptionalActionPlan> {
    const assignment = segment.projectAssignment;

    if (isNewProjectCandidateRoutedSegment(assignment)) {
      return {
        ...segment,
        actionPlan: attachSegmentLineageToActionPlan(
          segment,
          buildNewProjectCandidateActionPlan(assignment)
        ),
      };
    }

    if (isUnassignedRoutedSegment(assignment)) {
      return {
        ...segment,
        actionPlan: attachSegmentLineageToActionPlan(
          segment,
          buildUnassignedActionPlan(assignment)
        ),
      };
    }

    if (!isExistingProjectRoutedSegment(assignment)) {
      throw new ActiveNoteAnalysisError(
        "Segment has an unsupported project assignment destination"
      );
    }

    const projectContext = await this.ports.projectActionContext.get(
      assignment.projectId
    );
    const actionPlan = setTaskIdForAttachNoteAction(
      attachSegmentLineageToActionPlan(
        segment,
        await this.ports.actionPlanner.plan({
          routedSegment: assignment,
          projectContext,
          topic: segment.topic,
          contextualText: segment.contextualText,
        })
      )
    );

    return {
      ...segment,
      actionPlan,
    };
  }

  private async runPipelineStep<T>(
    fn: () => Promise<T>,
    options: {
      recoverableErrors?: ReadonlyArray<ErrorConstructor>;
      rethrowUnknown?: boolean;
    } = {}
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }
      if (
        options.recoverableErrors?.some(
          (ErrorType) => error instanceof ErrorType
        )
      ) {
        throw new ActiveNoteAnalysisError(ACTIVE_NOTE_ANALYSIS_FAILURE_MESSAGE);
      }
      if (options.rethrowUnknown) {
        throw error;
      }
      throw new ActiveNoteAnalysisError(ACTIVE_NOTE_ANALYSIS_FAILURE_MESSAGE);
    }
  }
}
