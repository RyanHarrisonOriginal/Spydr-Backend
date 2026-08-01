import {
  ACTIVE_NOTE_PROMPT_VERSION,
  ActiveNoteAnalysisError,
  collectTaskProjectMap,
  normalizeActiveNoteAIOutput,
  selectCandidateProjects,
  toProjectContext,
  type ActiveNoteAIOutput,
  type ActiveNoteAIProvider,
  type ActiveNoteAnalyzeRequest,
  type ActiveNoteCandidateProject,
  type ActiveNoteProjectContext,
} from "../../../active-notes/index.js";
import type { IProjectRepository } from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

interface AnalysisContext {
  selectedProject: ActiveNoteProjectContext | null;
  candidateProjects: ActiveNoteCandidateProject[];
  candidateProjectContexts: ActiveNoteProjectContext[];
}

export class AnalyzeActiveNoteQuery implements IQuery<ActiveNoteAIOutput> {
  static readonly queryType = "active-notes.analyze";
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ActiveNoteAnalyzeRequest
  ) {}
}

export class AnalyzeActiveNoteQueryHandler
  implements IQueryHandler<AnalyzeActiveNoteQuery, ActiveNoteAIOutput>
{
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly aiProvider: ActiveNoteAIProvider
  ) {}

  async execute(query: AnalyzeActiveNoteQuery): Promise<ActiveNoteAIOutput> {
    const content = query.input.content.trim();
    const context = await this.resolveContext(
      query.orgId,
      content,
      query.input.projectId ?? null
    );
    const raw = await this.analyzeWithProvider(content, context);

    return this.normalizeResult(content, context, raw);
  }

  private async resolveContext(
    orgId: string,
    content: string,
    projectId: string | null
  ): Promise<AnalysisContext> {
    if (projectId) {
      return this.resolveSelectedProjectContext(orgId, projectId);
    }
    return this.resolveCandidateProjectContext(orgId, content);
  }

  private async resolveSelectedProjectContext(
    orgId: string,
    projectId: string
  ): Promise<AnalysisContext> {
    const project = await this.projects.findByIdForOrg(projectId, orgId);
    if (!project) {
      throw new ActiveNoteAnalysisError("Project not found", 404);
    }

    const selectedProject = toProjectContext(project);
    return {
      selectedProject,
      candidateProjects: [
        {
          id: selectedProject.id,
          title: selectedProject.title,
          relevanceReason: "Selected project for this note",
        },
      ],
      candidateProjectContexts: [selectedProject],
    };
  }

  private async resolveCandidateProjectContext(
    orgId: string,
    content: string
  ): Promise<AnalysisContext> {
    const orgProjects = await this.projects.listByOrg(orgId);
    const candidateProjects = selectCandidateProjects(content, orgProjects, 5);

    const candidateProjectContexts: ActiveNoteProjectContext[] = [];
    for (const candidate of candidateProjects) {
      const hydrated = await this.projects.findByIdForOrg(candidate.id, orgId);
      if (hydrated) {
        candidateProjectContexts.push(toProjectContext(hydrated));
      }
    }

    return {
      selectedProject: null,
      candidateProjects,
      candidateProjectContexts,
    };
  }

  private async analyzeWithProvider(
    content: string,
    context: AnalysisContext
  ): Promise<ActiveNoteAIOutput> {
    try {
      return await this.aiProvider.analyze({
        content,
        promptVersion: ACTIVE_NOTE_PROMPT_VERSION,
        selectedProject: context.selectedProject,
        candidateProjects: context.candidateProjects,
        candidateProjectContexts: context.candidateProjectContexts,
      });
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again."
      );
    }
  }

  private normalizeResult(
    content: string,
    context: AnalysisContext,
    raw: ActiveNoteAIOutput
  ): ActiveNoteAIOutput {
    const allowedProjectIds = new Set(
      context.candidateProjects.map((project) => project.id)
    );
    const taskProjectMap = collectTaskProjectMap(
      context.candidateProjectContexts
    );

    return normalizeActiveNoteAIOutput({
      raw,
      sourceText: content,
      allowedProjectIds,
      taskProjectMap,
      fallbackCandidateProjects: context.candidateProjects,
    });
  }
}
