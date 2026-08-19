import { EmbeddingGenerationError } from "@spydr/ai";
import {
  generateSegmentEmbeddings,
  type GenerateEmbeddingFn,
} from "../helpers/generate-segment-embeddings.js";
import {
  ProjectRetrievalError,
  ProjectRetrievalService,
  type SearchProjectsByEmbeddingFn,
} from "../../project-routing/services/project-retrieval.service.js";
import { searchSegmentProjectMatches } from "../../project-routing/helpers/search-project-matches-for-segments.js";
import {
  ProjectActionContextError,
  ProjectActionContextService,
} from "../../action-planning/services/project-action-context.service.js";
import {
  isExistingProjectRoutedSegment,
  isNewProjectCandidateRoutedSegment,
  isUnassignedRoutedSegment,
} from "../../action-planning/helpers/build-segment-action-plan-prompt-input.js";
import { buildNewProjectCandidateActionPlan } from "../../action-planning/helpers/build-new-project-candidate-action-plan.js";
import { buildUnassignedActionPlan } from "../../action-planning/helpers/build-unassigned-action-plan.js";
import { attachSegmentLineageToActionPlan } from "../../action-planning/helpers/attach-segment-lineage-to-action-plan.js";
import { withTaskIdForAttachNoteAction } from "../../action-planning/helpers/with-task-id-for-attach-note-action.js";
import { stripPipelinePayload } from "../helpers/strip-pipeline-payload.js";
import type {
  ActiveNoteAIInput,
  ActiveNoteAIOutput,
  ActiveNoteAIProvider,
  ActiveNoteEmbeddedSegmentationResult,
  ActiveNoteProjectAssignmentResult,
  ActiveNoteProjectContextResult,
  ActiveNoteRequestContext,
  ActiveNoteSegmentationResult,
  SegmentActionPlan,
  SegmentWithProjectAssignment,
} from "../../types/shared.js";
import {
  ActiveNoteAnalysisError,
  toActiveNoteAIOutput,
} from "../../types/shared.js";
import type { PlanSegmentActionInput } from "../../action-planning/types/index.js";
import type { SegmentWithOptionalActionPlan } from "../../action-planning/types/segment-action-plan.types.js";

const ACTIVE_NOTE_ANALYSIS_FAILURE_MESSAGE =
  "Active note analysis failed. Please try again.";

type ErrorConstructor = abstract new (...args: never[]) => Error;

export interface ActiveNoteAIProviderBaseOptions {
  generateEmbedding?: GenerateEmbeddingFn;
  searchProjectsByEmbedding?: SearchProjectsByEmbeddingFn;
  createProjectRetrievalService?: (
    context: ActiveNoteRequestContext
  ) => ProjectRetrievalService;
  createProjectActionContextService?: () => ProjectActionContextService;
}

export abstract class ActiveNoteAIProviderBase implements ActiveNoteAIProvider {
  protected readonly generateEmbedding: GenerateEmbeddingFn;
  private readonly searchProjectsByEmbedding?: SearchProjectsByEmbeddingFn;
  private readonly createProjectRetrievalService?: (
    context: ActiveNoteRequestContext
  ) => ProjectRetrievalService;
  private readonly projectActionContextService: ProjectActionContextService;

  constructor(options: ActiveNoteAIProviderBaseOptions = {}) {
    if (!options.generateEmbedding) {
      throw new ActiveNoteAnalysisError(
        "Embedding generation is not configured",
        500
      );
    }
    this.generateEmbedding = options.generateEmbedding;
    this.searchProjectsByEmbedding = options.searchProjectsByEmbedding;
    this.createProjectRetrievalService = options.createProjectRetrievalService;
    this.projectActionContextService =
      options.createProjectActionContextService?.() ??
      new ProjectActionContextService();
  }

  async analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    const context: ActiveNoteRequestContext = {
      orgId: input.orgId,
      userId: input.userId,
    };
    const recorder = input.recorder;
    let currentStep = "segment";

    try {
      const segmented = await this.segment(input);
      await recorder?.recordStep("segment", {
        segments: segmented.segments,
      });

      currentStep = "embed";
      const embedded = await this.embedSegments(segmented);

      currentStep = "project_context";
      const withContext = await this.getProjectContext(embedded, context);
      await recorder?.recordStep(
        "project_context",
        stripPipelinePayload(withContext)
      );

      currentStep = "project_assignment";
      const withAssignment = await this.inferProjectAssignment(withContext);
      await recorder?.recordStep(
        "project_assignment",
        stripPipelinePayload(withAssignment)
      );

      currentStep = "action_plan";
      const output = await this.inferAction(withAssignment);
      await recorder?.recordStep("action_plan", stripPipelinePayload(output));

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

  abstract segment(
    input: ActiveNoteAIInput
  ): Promise<ActiveNoteSegmentationResult>;

  abstract inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult>;

  abstract planSegmentAction(
    input: PlanSegmentActionInput
  ): Promise<SegmentActionPlan>;

  async embedSegments(
    result: ActiveNoteSegmentationResult
  ): Promise<ActiveNoteEmbeddedSegmentationResult> {
    return this.runPipelineStep(async () => {
      const embeddedSegments = await generateSegmentEmbeddings(
        result.segments,
        this.generateEmbedding
      );
      return { embeddedSegments };
    }, { recoverableErrors: [EmbeddingGenerationError] });
  }

  async getProjectContext(
    result: ActiveNoteEmbeddedSegmentationResult,
    context: ActiveNoteRequestContext
  ): Promise<ActiveNoteProjectContextResult> {
    return this.runPipelineStep(async () => {
      const projectRetrievalService =
        this.createProjectRetrievalService?.(context) ??
        new ProjectRetrievalService({
          orgId: context.orgId,
          searchProjectsByEmbedding: this.searchProjectsByEmbedding,
        });
      const embeddedSegments = await searchSegmentProjectMatches(
        result.embeddedSegments,
        projectRetrievalService
      );
      return { embeddedSegments };
    }, {
      recoverableErrors: [ProjectRetrievalError, EmbeddingGenerationError],
      rethrowUnknown: true,
    });
  }

  async inferAction(
    result: ActiveNoteProjectAssignmentResult
  ): Promise<ActiveNoteAIOutput> {
    return this.runPipelineStep(async () => {
      const embeddedSegments = await Promise.all(
        result.embeddedSegments.map((segment) =>
          this.inferSegmentAction(segment)
        )
      );

      return toActiveNoteAIOutput({ embeddedSegments });
    }, { recoverableErrors: [ProjectActionContextError] });
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

    const projectContext =
      await this.projectActionContextService.getProjectActionContext(
        assignment.projectId
      );
    const actionPlan = withTaskIdForAttachNoteAction(
      attachSegmentLineageToActionPlan(
        segment,
        await this.planSegmentAction({
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
}
