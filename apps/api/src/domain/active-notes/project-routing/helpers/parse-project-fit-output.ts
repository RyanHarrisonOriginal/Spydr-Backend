import { projectFitEvaluationSchema } from "../schemas/index.js";
import { z } from "zod";
import type {
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  ProjectMatchBasis,
} from "../../types/shared.js";

const OBJECT_TARGET_MATCH_BASES = new Set<ProjectMatchBasis>([
  "existing_task",
  "existing_decision",
  "existing_idea",
]);

function normalizeExcerptForMatch(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function stripBulletPrefix(value: string): string {
  return value.replace(/^[-*•]\s+/, "").trim();
}

function excerptMatchesHaystack(haystack: string, excerpt: string): boolean {
  if (haystack.includes(excerpt)) {
    return true;
  }

  const normalizedHaystack = normalizeExcerptForMatch(haystack);
  const normalizedExcerpt = normalizeExcerptForMatch(excerpt);

  if (normalizedHaystack.includes(normalizedExcerpt)) {
    return true;
  }

  const excerptWithoutBullet = stripBulletPrefix(normalizedExcerpt);
  if (
    excerptWithoutBullet.length > 0 &&
    normalizedHaystack.includes(excerptWithoutBullet)
  ) {
    return true;
  }

  for (const line of haystack.split("\n")) {
    const normalizedLine = normalizeExcerptForMatch(line);
    if (!normalizedLine) {
      continue;
    }

    if (
      normalizedLine.includes(normalizedExcerpt) ||
      normalizedLine.includes(excerptWithoutBullet)
    ) {
      return true;
    }

    const lineWithoutBullet = stripBulletPrefix(normalizedLine);
    if (!lineWithoutBullet) {
      continue;
    }

    if (
      lineWithoutBullet.includes(normalizedExcerpt) ||
      lineWithoutBullet.includes(excerptWithoutBullet)
    ) {
      return true;
    }
  }

  return false;
}

export function containsVerbatimExcerpt(
  haystack: string,
  excerpt: string | null | undefined
): boolean {
  if (!excerpt) {
    return false;
  }

  return excerptMatchesHaystack(haystack, excerpt);
}

export function isProjectFitMatch(evaluation: ProjectFitEvaluation): boolean {
  return evaluation.verdict === "match";
}

function normalizeInitiativeIdentity(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bv\d+\b/g, "")
    .replace(/\b(version|rollout|project|initiative)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function initiativeIdentityMatches(left: string, right: string): boolean {
  const normalizedLeft = normalizeInitiativeIdentity(left);
  const normalizedRight = normalizeInitiativeIdentity(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

function projectEvidenceIsValid(
  candidate: ProjectAssignmentCandidate,
  parsed: ProjectFitEvaluation,
  segmentText: { sourceText: string; contextualText: string }
): boolean {
  if (!parsed.projectEvidence) {
    return false;
  }

  if (
    containsVerbatimExcerpt(candidate.projectName, parsed.projectEvidence) ||
    containsVerbatimExcerpt(candidate.retrievalContext, parsed.projectEvidence)
  ) {
    return true;
  }

  if (parsed.matchBasis !== "direct_project_reference") {
    return false;
  }

  const segmentCorpus = `${segmentText.sourceText} ${segmentText.contextualText}`;

  return (
    initiativeIdentityMatches(parsed.projectEvidence, candidate.projectName) ||
    initiativeIdentityMatches(parsed.segmentEvidence ?? "", candidate.projectName) ||
    initiativeIdentityMatches(segmentCorpus, candidate.projectName)
  );
}

function evidenceIsValid(
  segmentText: { sourceText: string; contextualText: string },
  candidate: ProjectAssignmentCandidate,
  parsed: ProjectFitEvaluation
): boolean {
  const segmentEvidenceValid =
    containsVerbatimExcerpt(segmentText.sourceText, parsed.segmentEvidence) ||
    containsVerbatimExcerpt(segmentText.contextualText, parsed.segmentEvidence);

  return segmentEvidenceValid && projectEvidenceIsValid(candidate, parsed, segmentText);
}

function targetObjectIsValid(
  candidate: ProjectAssignmentCandidate,
  parsed: ProjectFitEvaluation
): boolean {
  if (!OBJECT_TARGET_MATCH_BASES.has(parsed.matchBasis)) {
    return parsed.targetObjectId == null && parsed.targetObjectTitle == null;
  }

  if (!parsed.targetObjectTitle) {
    return false;
  }

  const titleValid = containsVerbatimExcerpt(
    candidate.retrievalContext,
    parsed.targetObjectTitle
  );

  if (!titleValid) {
    return false;
  }

  if (parsed.targetObjectId == null) {
    return true;
  }

  return containsVerbatimExcerpt(
    candidate.retrievalContext,
    parsed.targetObjectId
  );
}

function createSchemaRejectedEvaluation(
  candidate: ProjectAssignmentCandidate,
  reason: string,
  confidence = 0.3
): ProjectFitEvaluation {
  return {
    projectId: candidate.projectId,
    projectName: candidate.projectName,
    verdict: "insufficient_evidence",
    matchBasis: "none",
    confidence,
    segmentEvidence: null,
    projectEvidence: null,
    targetObjectId: null,
    targetObjectTitle: null,
    reason,
  };
}

function normalizeParsedEvaluation(
  raw: z.infer<typeof projectFitEvaluationSchema>
): ProjectFitEvaluation {
  return {
    ...raw,
    segmentEvidence: raw.segmentEvidence ?? null,
    projectEvidence: raw.projectEvidence ?? null,
    targetObjectId: raw.targetObjectId ?? null,
    targetObjectTitle: raw.targetObjectTitle ?? null,
  };
}

function rejectInvalidMatch(
  parsed: ProjectFitEvaluation,
  detail: string
): ProjectFitEvaluation {
  return {
    projectId: parsed.projectId,
    projectName: parsed.projectName,
    verdict: "insufficient_evidence",
    matchBasis: "none",
    confidence: Math.min(parsed.confidence, 0.49),
    segmentEvidence: null,
    projectEvidence: null,
    targetObjectId: null,
    targetObjectTitle: null,
    reason: `${parsed.reason} Match was rejected: ${detail}`,
  };
}
function normalizeNonMatchEvaluation(
  parsed: ProjectFitEvaluation
): ProjectFitEvaluation {
  return {
    ...parsed,
    matchBasis: "none",
    segmentEvidence: null,
    projectEvidence: null,
    targetObjectId: null,
    targetObjectTitle: null,
  };
}

function validateMatchVerdict(
  parsed: ProjectFitEvaluation,
  candidate: ProjectAssignmentCandidate,
  segmentText: { sourceText: string; contextualText: string }
): ProjectFitEvaluation {
  if (parsed.matchBasis === "none") {
    return rejectInvalidMatch(parsed, "matchBasis cannot be none.");
  }

  if (!parsed.segmentEvidence || !parsed.projectEvidence) {
    return rejectInvalidMatch(parsed, "match evidence is missing.");
  }

  if (!evidenceIsValid(segmentText, candidate, parsed)) {
    return rejectInvalidMatch(
      parsed,
      "cited evidence was not found verbatim in the supplied segment or Project context."
    );
  }

  if (!targetObjectIsValid(candidate, parsed)) {
    return rejectInvalidMatch(
      parsed,
      "required target object fields are missing or invalid."
    );
  }

  return parsed;
}

export function parseProjectFitEvaluationOutput(
  raw: unknown,
  candidate: ProjectAssignmentCandidate,
  segmentText: { sourceText: string; contextualText: string }
): ProjectFitEvaluation {
  const parsedResult = projectFitEvaluationSchema.safeParse(raw);

  if (!parsedResult.success) {
    return createSchemaRejectedEvaluation(
      candidate,
      "Model response failed project fit schema validation."
    );
  }

  const parsed = normalizeParsedEvaluation(parsedResult.data);

  if (parsed.projectId !== candidate.projectId) {
    return createSchemaRejectedEvaluation(
      candidate,
      "Returned projectId did not match the evaluated candidate."
    );
  }

  if (parsed.projectName !== candidate.projectName) {
    return createSchemaRejectedEvaluation(
      candidate,
      "Returned projectName did not match the evaluated candidate."
    );
  }

  if (parsed.verdict === "match") {
    return validateMatchVerdict(parsed, candidate, segmentText);
  }

  return normalizeNonMatchEvaluation(parsed);
}
