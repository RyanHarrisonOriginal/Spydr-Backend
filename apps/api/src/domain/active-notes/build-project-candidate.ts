import type {
  ProjectAssignmentCandidate,
  ProjectSemanticMatch,
} from "../types/index.js";

export function extractProjectNameFromRetrievalDocument(
  retrievalDocument: string
): string | null {
  const firstLine = retrievalDocument.split("\n")[0]?.trim() ?? "";
  if (!firstLine.startsWith("PROJECT:")) {
    return null;
  }

  const name = firstLine.slice("PROJECT:".length).trim();
  return name.length > 0 ? name : null;
}

export function toProjectAssignmentCandidate(
  match: ProjectSemanticMatch
): ProjectAssignmentCandidate {
  return {
    projectId: match.projectId,
    projectName:
      extractProjectNameFromRetrievalDocument(match.retrievalDocument) ??
      "Unknown Project",
    retrievalContext: match.retrievalDocument,
  };
}
