export type PersonCollectionNodeType = "project" | "task";

export interface IPersonCollectionSortRepository {
  getSortOrderMap(
    orgId: string,
    personNodeId: string,
    nodeIds: readonly string[]
  ): Promise<Map<string, number>>;

  reorderForPerson(
    orgId: string,
    personNodeId: string,
    nodeType: PersonCollectionNodeType,
    orderedIds: readonly string[],
    eligibleIds: readonly string[]
  ): Promise<void>;

  deleteForPerson(orgId: string, personNodeId: string): Promise<void>;
}
