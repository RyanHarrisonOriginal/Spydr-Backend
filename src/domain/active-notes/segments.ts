import {
  ACTIVE_NOTE_EXISTING_PROJECT_MATCH_CONFIDENCE_FLOOR,
  ACTIVE_NOTE_MAX_SEGMENTS,
  type ActiveNoteImpact,
  type ActiveNoteRoutingDecision,
  type ActiveNoteRoutingDestination,
  type ActiveNoteSegment,
  type ActiveNoteSegmentRoute,
  type ActiveNoteCandidateProject,
  type ActiveNoteProposal,
} from "./types.js";

/** Used only for segment-match scoring when segment metadata is incomplete. */
export function noteTitleFromSource(sourceText: string): string {
  const line = sourceText.trim().split(/\r?\n/)[0]?.trim() || "Active note";
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

export function normalizeSegments(
  rawSegments: ActiveNoteSegment[] | undefined,
  sourceText: string,
  warnings: string[]
): ActiveNoteSegment[] {
  const seen = new Set<string>();
  const segments: ActiveNoteSegment[] = [];

  for (const segment of rawSegments ?? []) {
    const ref = segment.ref?.trim();
    const text = segment.text?.trim();
    const subject = segment.subject?.trim();
    if (!ref || !text || !subject) {
      warnings.push("Removed incomplete segment");
      continue;
    }
    if (seen.has(ref)) {
      warnings.push(`Removed duplicate segment ref: ${ref}`);
      continue;
    }
    seen.add(ref);
    segments.push({ ref, text, subject });
    if (segments.length >= ACTIVE_NOTE_MAX_SEGMENTS) {
      warnings.push(`Limited segments to ${ACTIVE_NOTE_MAX_SEGMENTS}`);
      break;
    }
  }

  if (segments.length === 0) {
    warnings.push("Model omitted valid segments");
  }

  return segments;
}

export function routeFromRoutingDecision(
  segmentRef: string,
  routing: ActiveNoteRoutingDecision,
  impact?: ActiveNoteImpact | null
): ActiveNoteSegmentRoute {
  return {
    segmentRef,
    destination: routing.destination,
    projectId: routing.projectId ?? null,
    relatedTaskId: routing.relatedTaskId ?? null,
    reason: routing.reason,
    confidence: routing.confidence,
    impact: impact ?? null,
  };
}

export function routingDecisionFromRoute(
  route: ActiveNoteSegmentRoute
): ActiveNoteRoutingDecision {
  return {
    destination: route.destination,
    projectId: route.projectId ?? null,
    relatedTaskId: route.relatedTaskId ?? null,
    reason: route.reason,
    confidence: route.confidence,
  };
}

export function normalizeRawRoutes(
  rawRoutes: ActiveNoteSegmentRoute[] | undefined,
  segments: ActiveNoteSegment[],
  candidatePool: ActiveNoteCandidateProject[],
  allowedProjectIds: Set<string>,
  fallbackRouting: ActiveNoteRoutingDecision,
  fallbackImpact: ActiveNoteImpact | null | undefined,
  warnings: string[]
): ActiveNoteSegmentRoute[] {
  const segmentRefs = new Set(segments.map((s) => s.ref));
  const routes: ActiveNoteSegmentRoute[] = [];
  const seenSegments = new Set<string>();

  for (const route of rawRoutes ?? []) {
    const segmentRef = route.segmentRef?.trim();
    if (!segmentRef || !segmentRefs.has(segmentRef)) {
      warnings.push(
        `Removed route with invalid segmentRef: ${route.segmentRef ?? "(empty)"}`
      );
      continue;
    }
    if (seenSegments.has(segmentRef)) {
      warnings.push(`Removed duplicate route for segment: ${segmentRef}`);
      continue;
    }
    seenSegments.add(segmentRef);
    routes.push({
      segmentRef,
      destination: route.destination,
      projectId: route.projectId ?? null,
      relatedTaskId: route.relatedTaskId ?? null,
      reason: route.reason.trim() || "Segment routing",
      confidence: route.confidence,
      impact: route.impact ?? null,
    });
  }

  for (const segment of segments) {
    if (seenSegments.has(segment.ref)) continue;
    warnings.push(`Synthesized route for segment ${segment.ref}`);
    if (segments.length === 1) {
      routes.push(
        routeFromRoutingDecision(
          segment.ref,
          fallbackRouting,
          fallbackImpact ?? null
        )
      );
      continue;
    }
    const match = resolveSegmentMatch(
      segment.text,
      segment.subject,
      candidatePool,
      allowedProjectIds
    );
    routes.push({
      segmentRef: segment.ref,
      destination: match.destination,
      projectId: match.projectId,
      relatedTaskId: null,
      reason: match.reason,
      confidence: match.confidence,
      impact:
        match.destination === "existing_project"
          ? {
              type: "project_context",
              reason: "Logged segment on matched project",
            }
          : null,
    });
  }

  // Preserve segment order.
  const byRef = new Map(routes.map((r) => [r.segmentRef, r]));
  return segments
    .map((segment) => byRef.get(segment.ref))
    .filter((route): route is ActiveNoteSegmentRoute => Boolean(route));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

export function scoreSegmentProjectMatch(
  segmentText: string,
  candidate: ActiveNoteCandidateProject
): number {
  const contentTokens = new Set(tokenize(segmentText));
  if (contentTokens.size === 0) return 0;

  const titleTokens = tokenize(candidate.title);
  let score = 0;
  for (const token of titleTokens) {
    if (contentTokens.has(token)) score += 2;
  }
  const reasonTokens = tokenize(candidate.relevanceReason ?? "");
  for (const token of reasonTokens) {
    if (contentTokens.has(token)) score += 1;
  }
  return score;
}

export function segmentMatchConfidence(score: number): number {
  if (score <= 0) return 0.45;
  return Math.min(0.95, 0.55 + score * 0.08);
}

export function resolveSegmentMatch(
  segmentText: string,
  segmentSubject: string,
  candidates: ActiveNoteCandidateProject[],
  allowedProjectIds: Set<string>
): {
  destination: ActiveNoteRoutingDestination;
  projectId: string | null;
  confidence: number;
  reason: string;
} {
  const combined = `${segmentSubject} ${segmentText}`.trim();
  const allowed = candidates.filter((c) => allowedProjectIds.has(c.id));

  if (allowed.length === 0) {
    return {
      destination: "new_project",
      projectId: null,
      confidence: 0.55,
      reason: "No catalog projects available; segment needs a new project container",
    };
  }

  let best: ActiveNoteCandidateProject | null = null;
  let bestScore = -1;
  for (const candidate of allowed) {
    const score = scoreSegmentProjectMatch(combined, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const confidence = segmentMatchConfidence(bestScore);

  if (
    best &&
    bestScore > 0 &&
    confidence >= ACTIVE_NOTE_EXISTING_PROJECT_MATCH_CONFIDENCE_FLOOR
  ) {
    return {
      destination: "existing_project",
      projectId: best.id,
      confidence,
      reason: `Segment belongs to ${best.title}`,
    };
  }

  return {
    destination: "new_project",
    projectId: null,
    confidence: Math.max(confidence, 0.55),
    reason:
      bestScore > 0 && best
        ? `Segment subject does not adequately match catalog; distinct from ${best.title}`
        : "No catalog project matches this segment subject",
  };
}

export function pickCandidateForSegment(
  segmentText: string,
  candidates: ActiveNoteCandidateProject[],
  allowedProjectIds: Set<string>
): ActiveNoteCandidateProject | null {
  const allowed = candidates.filter((c) => allowedProjectIds.has(c.id));
  if (allowed.length === 0) return null;

  const contentTokens = new Set(tokenize(segmentText));
  if (contentTokens.size === 0) return allowed[0] ?? null;

  let best: ActiveNoteCandidateProject | null = null;
  let bestScore = -1;
  for (const candidate of allowed) {
    const score = scoreSegmentProjectMatch(segmentText, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best ?? allowed[0] ?? null;
}

export function deriveSummaryRouting(
  routes: ActiveNoteSegmentRoute[],
  segments: ActiveNoteSegment[]
): { routing: ActiveNoteRoutingDecision; impact: ActiveNoteImpact | null } {
  if (routes.length === 0) {
    return {
      routing: {
        destination: "no_action",
        projectId: null,
        relatedTaskId: null,
        reason: "No routes available",
        confidence: 0.5,
      },
      impact: null,
    };
  }

  if (routes.length === 1) {
    const route = routes[0]!;
    return {
      routing: routingDecisionFromRoute(route),
      impact:
        route.destination === "existing_project" ? route.impact ?? null : null,
    };
  }

  const destinations = new Set(routes.map((r) => r.destination));
  let destination: ActiveNoteRoutingDestination = "idea_only";
  if ([...destinations].every((d) => d === "existing_project")) {
    destination = "existing_project";
  } else if ([...destinations].some((d) => d === "new_project")) {
    destination = "new_project";
  } else if ([...destinations].some((d) => d === "existing_project")) {
    destination = "existing_project";
  }

  const subjects = segments
    .map((s) => s.subject)
    .filter(Boolean)
    .slice(0, 5);
  const confidence =
    routes.reduce((sum, route) => sum + route.confidence, 0) / routes.length;

  return {
    routing: {
      destination,
      projectId: null,
      relatedTaskId: null,
      reason: `Multi-project note with ${routes.length} contexts: ${subjects.join("; ")}`,
      confidence: Math.min(1, confidence),
    },
    impact: null,
  };
}

export function overlapScore(evidence: string[], segmentText: string): number {
  if (!segmentText.trim()) return 0;
  const haystack = segmentText.toLowerCase();
  let score = 0;
  for (const item of evidence) {
    const needle = item.trim().toLowerCase();
    if (needle && haystack.includes(needle)) score += needle.length;
  }
  return score;
}

export function resolveProposalSegmentRef(
  proposal: ActiveNoteProposal,
  segments: ActiveNoteSegment[],
  multiSegment: boolean,
  warnings: string[]
): string | null {
  const explicit = proposal.segmentRef?.trim() || null;
  if (explicit && segments.some((s) => s.ref === explicit)) {
    return explicit;
  }
  if (explicit) {
    warnings.push(
      `Removed invalid segmentRef on ${proposal.ref}: ${explicit}`
    );
  }

  if (!multiSegment) {
    return segments[0]?.ref ?? null;
  }

  let bestRef: string | null = null;
  let bestScore = 0;
  for (const segment of segments) {
    const score = overlapScore(proposal.evidence, segment.text);
    if (score > bestScore) {
      bestScore = score;
      bestRef = segment.ref;
    }
  }

  if (bestRef) {
    warnings.push(
      `Assigned ${proposal.ref} to segment ${bestRef} by evidence overlap`
    );
    return bestRef;
  }

  warnings.push(`Could not assign segment for ${proposal.ref}`);
  return null;
}

export function hasActionableProposals(
  proposals: ActiveNoteProposal[]
): boolean {
  return proposals.some((proposal) => proposal.operationType !== "no_action");
}
