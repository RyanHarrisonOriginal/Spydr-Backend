import {
  ActiveNoteAnalysisError,
  type ActiveNoteAIOutput,
  type ActiveNoteAIProvider,
  type ActiveNoteAnalyzeRequest,
} from "../../../active-notes/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly aiProvider: ActiveNoteAIProvider) {}

  async execute(query: AnalyzeActiveNoteQuery): Promise<ActiveNoteAIOutput> {
    const content = query.input.content.trim();

    try {
      return await this.aiProvider.analyze({
        content,
        orgId: query.orgId,
        userId: query.userId,
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
}
