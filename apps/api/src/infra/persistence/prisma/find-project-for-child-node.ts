import type { PrismaClient } from "@prisma/client";

type ProjectLookupDbClient = Pick<PrismaClient, "spydrNode" | "spydrNodeRelationship">;

export async function findProjectIdForChildNode(
  db: ProjectLookupDbClient,
  orgId: string,
  childNodeId: string
): Promise<string | null> {
  const relationships = await db.spydrNodeRelationship.findMany({
    where: {
      orgId,
      OR: [{ sourceNodeId: childNodeId }, { targetNodeId: childNodeId }],
    },
    select: {
      sourceNodeId: true,
      targetNodeId: true,
    },
  });

  if (relationships.length === 0) {
    return null;
  }

  const relatedNodeIds = relationships.map((relationship) =>
    relationship.sourceNodeId === childNodeId
      ? relationship.targetNodeId
      : relationship.sourceNodeId
  );

  const project = await db.spydrNode.findFirst({
    where: {
      orgId,
      id: { in: relatedNodeIds },
      nodeType: "project",
      isDeleted: false,
    },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return project?.id ?? null;
}
