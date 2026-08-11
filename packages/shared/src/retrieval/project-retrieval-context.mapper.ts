import { SpydrNodeType } from "@prisma/client";
import type {
  ProjectRetrievalChildRows,
  ProjectRetrievalDecisionRow,
  ProjectRetrievalIdeaRow,
  ProjectRetrievalNoteRow,
  ProjectRetrievalTaskRow,
  RelatedRetrievalNode,
} from "./project-retrieval.types.js";

function mapTaskRow(node: RelatedRetrievalNode): ProjectRetrievalTaskRow {
  return {
    id: node.id,
    title: node.title,
    body: node.body,
    status: node.status,
    sortOrder: node.sortOrder,
    updatedAt: node.updatedAt,
  };
}

function mapDecisionRow(node: RelatedRetrievalNode): ProjectRetrievalDecisionRow {
  return {
    id: node.id,
    title: node.title,
    updatedAt: node.updatedAt,
    decidedAt: node.decisionDetails?.decidedAt ?? null,
  };
}

function mapIdeaRow(node: RelatedRetrievalNode): ProjectRetrievalIdeaRow {
  return {
    id: node.id,
    title: node.title,
    updatedAt: node.updatedAt,
  };
}

function mapNoteRow(node: RelatedRetrievalNode): ProjectRetrievalNoteRow {
  return {
    id: node.id,
    title: node.title,
    body: node.body,
    updatedAt: node.updatedAt,
  };
}

export function mapRelatedNodesToRetrievalRows(
  relatedNodes: readonly RelatedRetrievalNode[]
): ProjectRetrievalChildRows {
  const rows: ProjectRetrievalChildRows = {
    tasks: [],
    decisions: [],
    ideas: [],
    notes: [],
  };

  for (const node of relatedNodes) {
    switch (node.nodeType) {
      case SpydrNodeType.task:
        rows.tasks.push(mapTaskRow(node));
        break;
      case SpydrNodeType.decision:
        rows.decisions.push(mapDecisionRow(node));
        break;
      case SpydrNodeType.idea:
        rows.ideas.push(mapIdeaRow(node));
        break;
      case SpydrNodeType.note:
        rows.notes.push(mapNoteRow(node));
        break;
    }
  }

  return rows;
}
