import type { SpydrRelationshipType } from "../shared/models/shared.js";

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
  get(criteria: { id: string; orgId?: string }): Promise<ISpydrNodeRelationship | null>;
  save(relationship: ISpydrNodeRelationship): Promise<ISpydrNodeRelationship>;
  delete(id: string): Promise<void>;
}
