import type { SpydrRelationshipType } from "../models/index.js";

export interface ISpydrNodeRelationship {
  id: string;
  orgId: string;
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: SpydrRelationshipType;
  reason: string | null;
  createdAt: Date;
}

export interface ISpydrNodeRelationshipRepository {
  listForNode(nodeId: string, orgId: string): Promise<ISpydrNodeRelationship[]>;
  save(relationship: ISpydrNodeRelationship): Promise<ISpydrNodeRelationship>;
  delete(id: string): Promise<void>;
}
