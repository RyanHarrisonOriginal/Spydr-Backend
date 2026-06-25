import type { IQuery, IQueryHandler } from "../query.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { PersonNode } from "../../../models/people/index.js";

export class ListPeopleQuery implements IQuery<PersonNode[]> {
  static readonly queryType = "people.list";
  readonly queryType = ListPeopleQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListPeopleQueryHandler
  implements IQueryHandler<ListPeopleQuery, PersonNode[]>
{
  readonly queryType = ListPeopleQuery.queryType;

  constructor(private readonly people: IPersonRepository) {}

  execute(query: ListPeopleQuery): Promise<PersonNode[]> {
    return this.people.listByUser(query.userId);
  }
}
