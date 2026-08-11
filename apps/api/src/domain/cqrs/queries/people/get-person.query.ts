import type { IQuery, IQueryHandler } from "../query.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { PersonNode } from "../../../models/people/index.js";

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

  constructor(private readonly people: IPersonRepository) {}

  execute(query: GetPersonQuery): Promise<PersonNode | null> {
    return this.people.findByIdForOrg(query.personId, query.orgId);
  }
}
