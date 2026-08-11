import type { PrismaClient, SpydrNodeStatus } from "@prisma/client";

export type SpydrProjectDbClient = Pick<
  PrismaClient,
  "spydrNode" | "spydrNodeRelationship"
>;

export interface ActiveProjectSummary {
  id: string;
  orgId: string;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  updatedAt: Date;
}

export interface ProjectRetrievalHeader {
  orgId: string;
  title: string;
  body: string;
}

export interface ProjectChildNodeCounts {
  taskCount: number;
  noteCount: number;
  decisionCount: number;
  ideaCount: number;
}
