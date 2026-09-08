import type { SpydrNodeType } from "../models/shared.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";

export async function nextCollectionSortOrder(
  nodes: ISpydrNodeViews,
  orgId: string,
  nodeType: SpydrNodeType
): Promise<number> {
  return nodes.nextSortOrderForOrg(orgId, nodeType);
}
