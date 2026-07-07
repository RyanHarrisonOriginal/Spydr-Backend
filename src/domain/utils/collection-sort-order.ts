import type { ISpydrNodeRepository } from "../interfaces/index.js";
import type { SpydrNodeType } from "../models/index.js";

export async function nextCollectionSortOrder(
  nodes: ISpydrNodeRepository,
  orgId: string,
  nodeType: SpydrNodeType
): Promise<number> {
  return nodes.nextSortOrderForOrg(orgId, nodeType);
}
