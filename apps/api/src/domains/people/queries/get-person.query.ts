import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IPersonViews } from "../views.js";
import type { PersonNode } from "../models/index.js";

export class GetPersonQuery implements IQuery<PersonNode | null> {
  static readonly queryType = "people.get";
  readonly queryType = GetPersonQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly personId: string
  ) {}
}

export class GetPersonQueryHandler
  implements IQueryHandler<GetPersonQuery, PersonNode | null>
{
  readonly queryType = GetPersonQuery.queryType;

  constructor(private readonly people: IPersonViews) {}

  execute(query: GetPersonQuery): Promise<PersonNode | null> {
    return this.people.getById(query.orgId, query.personId);
  }
}
