import type { IQuery, IQueryHandler } from "../query.js";
import type { IPersonWork, IPersonWorkRepository } from "../../../interfaces/person-work-repository.js";

export class GetPersonWorkQuery implements IQuery<IPersonWork | null> {
  static readonly queryType = "people.getWork";
  readonly queryType = GetPersonWorkQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly personId: string
  ) {}
}

export class GetPersonWorkQueryHandler
  implements IQueryHandler<GetPersonWorkQuery, IPersonWork | null>
{
  readonly queryType = GetPersonWorkQuery.queryType;

  constructor(private readonly personWork: IPersonWorkRepository) {}

  execute(query: GetPersonWorkQuery): Promise<IPersonWork | null> {
    return this.personWork.getWork(query.orgId, query.personId);
  }
}
