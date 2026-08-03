import { activeNoteAIOutputSchema } from "./schemas.js";
import {
  deriveSummaryRouting,
  hasActionableProposals,
  noteTitleFromSource,
  normalizeRawRoutes,
  normalizeSegments,
  resolveProposalSegmentRef,
  resolveSegmentMatch,
  routingDecisionFromRoute,
} from "./segments.js";
import {
  ACTIVE_NOTE_EXISTING_PROJECT_MATCH_CONFIDENCE_FLOOR,
  ACTIVE_NOTE_MAX_NOTE_TITLE_LENGTH,
  ACTIVE_NOTE_MAX_PROJECT_TITLE_LENGTH,
  ACTIVE_NOTE_MAX_PROPOSALS,
  type ActiveNoteAIOutput,
  type ActiveNoteCandidateProject,
  type ActiveNoteObjectType,
  type ActiveNoteProposal,
  type ActiveNoteRoutingDecision,
  type ActiveNoteSegment,
  type ActiveNoteSegmentRoute,
} from "./types.js";

const PROJECT_SCOPED_TYPES: ReadonlySet<ActiveNoteObjectType> = new Set([
  "task",
  "note",
  "decision",
  "idea",
]);

const VAGUE_PERSON_PATTERNS: RegExp[] = [
  /\b(?:a|the)\s+big\s+guy\b/i,
  /\bsomeone\b/i,
  /\bsomebody\b/i,
  /\bthe\s+customer\b/i,
  /\bmy\s+manager\b/i,
  /\bthe\s+opponent\b/i,
  /\ba\s+(?:guy|girl|person|man|woman|dude)\b/i,
  /\bthey\b/i,
  /\bthem\b/i,
];

const SUPPORTED_OBJECT_TYPES = new Set([
  "project",
  "task",
  "note",
  "decision",
  "idea",
  "person",
]);

const SUPPORTED_OPERATION_TYPES = new Set([
  "create",
  "suggest_create",
  "attach_context",
  "no_action",
]);

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sourceMentions(sourceText: string, candidate: string): boolean {
  const normalizedSource = sourceText.toLowerCase();
  const normalizedCandidate = candidate.trim().toLowerCase();
  if (!normalizedCandidate) return false;
  return normalizedSource.includes(normalizedCandidate);
}

function isVaguePersonReference(
  sourceText: string,
  proposal: ActiveNoteProposal
): boolean {
  const name = proposal.payload.name ?? proposal.payload.title ?? "";
  if (!name.trim()) return true;

  const evidenceBlob = proposal.evidence.join(" ");
  const haystack = `${sourceText}\n${evidenceBlob}\n${name}`;

  if (VAGUE_PERSON_PATTERNS.some((pattern) => pattern.test(haystack))) {
    const looksNamed =
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(name.trim()) ||
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name.trim()) ||
      /\bCoach\s+[A-Z][a-z]+\b/.test(name) ||
      (/^[A-Z][a-z]+$/.test(name.trim()) &&
        sourceMentions(sourceText, name) &&
        !VAGUE_PERSON_PATTERNS.some((pattern) => pattern.test(name)));

    if (!looksNamed) return true;
  }

  if (VAGUE_PERSON_PATTERNS.some((pattern) => pattern.test(name))) {
    return true;
  }

  return (
    !sourceMentions(sourceText, name) &&
    proposal.evidence.every(
      (item) =>
        !sourceMentions(sourceText, item) ||
        VAGUE_PERSON_PATTERNS.some((p) => p.test(item))
    )
  );
}

function dueDateSupportedByText(sourceText: string, dueDate: string): boolean {
  if (!dueDate.trim()) return false;
  const lower = sourceText.toLowerCase();
  const dateToken = dueDate.toLowerCase();
  if (lower.includes(dateToken)) return true;

  const relativeHints = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "tomorrow",
    "today",
    "tonight",
    "next week",
    "this week",
  ];

  return relativeHints.some((hint) => lower.includes(hint));
}

function prioritySupportedByText(sourceText: string, priority: string): boolean {
  const lower = sourceText.toLowerCase();
  return (
    lower.includes(priority.toLowerCase()) ||
    lower.includes("urgent") ||
    lower.includes("asap") ||
    lower.includes("critical") ||
    lower.includes("high priority") ||
    lower.includes("low priority")
  );
}

const TITLED_OBJECT_TYPES: ReadonlySet<ActiveNoteObjectType> = new Set([
  "project",
  "task",
  "note",
  "idea",
  "decision",
]);

function hasRequiredLlmTitle(proposal: ActiveNoteProposal): boolean {
  if (proposal.operationType === "no_action") return true;

  const { payload, objectType } = proposal;
  if (objectType === "person") {
    return Boolean(payload.name?.trim() || payload.title?.trim());
  }
  if (!TITLED_OBJECT_TYPES.has(objectType)) return true;
  return Boolean(payload.title?.trim());
}

function hasUsablePayload(proposal: ActiveNoteProposal): boolean {
  if (proposal.operationType === "no_action") return true;
  if (!hasRequiredLlmTitle(proposal)) return false;

  const { payload, objectType } = proposal;
  if (objectType === "note") {
    return Boolean(payload.content?.trim());
  }
  if (objectType === "project") {
    return Boolean(payload.title?.trim());
  }
  return true;
}

function parentProjectId(proposal: ActiveNoteProposal): string | null {
  return proposal.parent?.projectId?.trim() || null;
}

function parentProjectRef(proposal: ActiveNoteProposal): string | null {
  return proposal.parent?.projectRef?.trim() || null;
}

function resolveSuggestedProjectId(
  proposal: ActiveNoteProposal,
  routing: ActiveNoteRoutingDecision
): string | null {
  return (
    parentProjectId(proposal) ||
    (routing.destination === "existing_project"
      ? routing.projectId?.trim() || null
      : null)
  );
}

function segmentProjectRef(segmentRef: string): string {
  return `project_${segmentRef}`;
}

function truncateTitle(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

function repairProposalFromSegment(
  proposal: ActiveNoteProposal,
  segment: ActiveNoteSegment | undefined,
  sourceText: string,
  warnings: string[]
): ActiveNoteProposal {
  const segmentText = segment?.text?.trim() || sourceText.trim();
  const segmentSubject =
    segment?.subject?.trim() || noteTitleFromSource(segmentText);
  const next: ActiveNoteProposal = {
    ...proposal,
    payload: { ...proposal.payload },
    evidence: [...proposal.evidence],
  };

  if (
    TITLED_OBJECT_TYPES.has(next.objectType) &&
    !next.payload.title?.trim()
  ) {
    const maxLength =
      next.objectType === "project"
        ? ACTIVE_NOTE_MAX_PROJECT_TITLE_LENGTH
        : ACTIVE_NOTE_MAX_NOTE_TITLE_LENGTH;
    warnings.push(`Filled missing title on ${next.ref} from segment`);
    next.payload.title = truncateTitle(segmentSubject, maxLength);
  }

  if (next.objectType === "person" && !next.payload.name?.trim()) {
    if (next.payload.title?.trim()) {
      next.payload.name = next.payload.title.trim();
    }
  }

  if (next.objectType === "note" && !next.payload.content?.trim()) {
    next.payload.content = segmentText;
  }

  if (next.evidence.length === 0 && next.operationType !== "no_action") {
    warnings.push(`Filled missing evidence on ${next.ref}`);
    next.evidence = [segmentText.slice(0, 500)];
  }

  return next;
}

function buildSynthesizedProjectProposal(
  segment: ActiveNoteSegment,
  segmentRef: string,
  projectRef: string
): ActiveNoteProposal {
  return {
    ref: projectRef,
    operationType: "suggest_create",
    objectType: "project",
    parent: null,
    attachment: null,
    payload: {
      title: truncateTitle(
        segment.subject,
        ACTIVE_NOTE_MAX_PROJECT_TITLE_LENGTH
      ),
      description: segment.text,
    },
    explicitlyStated: false,
    confidence: 0.5,
    evidence: [segment.text.slice(0, 500)],
    reason: `New project for ${segment.subject}`,
    segmentRef,
    requiresProject: false,
    suggestedProjectId: null,
  };
}

function buildSynthesizedNoteProposal(
  segment: ActiveNoteSegment,
  segmentRef: string,
  projectRef: string
): ActiveNoteProposal {
  return {
    ref: `note_${segmentRef}`,
    operationType: "create",
    objectType: "note",
    parent: { projectId: null, projectRef },
    attachment: { type: "project", id: null, ref: projectRef },
    payload: {
      title: truncateTitle(segment.subject, ACTIVE_NOTE_MAX_NOTE_TITLE_LENGTH),
      content: segment.text,
    },
    explicitlyStated: false,
    confidence: 0.5,
    evidence: [segment.text.slice(0, 500)],
    reason: `Journal entry for ${segment.subject}`,
    segmentRef,
    requiresProject: true,
    suggestedProjectId: null,
  };
}

function ensureNewProjectPackage(
  proposals: ActiveNoteProposal[],
  route: ActiveNoteSegmentRoute,
  segment: ActiveNoteSegment,
  seenRefs: Set<string>,
  warnings: string[]
): void {
  const segmentProposals = proposals.filter(
    (proposal) => proposal.segmentRef === route.segmentRef
  );
  const projectRef = segmentProjectRef(route.segmentRef);
  let projectProposals = segmentProposals.filter(
    (proposal) => proposal.objectType === "project"
  );

  if (projectProposals.length === 0) {
    if (!seenRefs.has(projectRef)) {
      proposals.push(
        buildSynthesizedProjectProposal(segment, route.segmentRef, projectRef)
      );
      seenRefs.add(projectRef);
      projectProposals = proposals.filter(
        (proposal) =>
          proposal.segmentRef === route.segmentRef &&
          proposal.objectType === "project"
      );
      warnings.push(
        `Synthesized Project proposal for new_project segment ${route.segmentRef}`
      );
    }
  } else if (projectProposals.length > 1) {
    const keep = projectProposals[0]!.ref;
    for (let index = proposals.length - 1; index >= 0; index -= 1) {
      const item = proposals[index]!;
      if (
        item.segmentRef === route.segmentRef &&
        item.objectType === "project" &&
        item.ref !== keep
      ) {
        proposals.splice(index, 1);
      }
    }
    projectProposals = proposals.filter(
      (proposal) =>
        proposal.segmentRef === route.segmentRef &&
        proposal.objectType === "project"
    );
    warnings.push(
      `Kept only one Project proposal for new_project segment ${route.segmentRef}`
    );
  }

  const resolvedProjectRef = projectProposals[0]?.ref ?? projectRef;

  for (const proposal of proposals) {
    if (
      proposal.segmentRef !== route.segmentRef ||
      proposal.objectType === "project" ||
      proposal.operationType === "no_action"
    ) {
      continue;
    }

    if (!parentProjectId(proposal) && !parentProjectRef(proposal)) {
      proposal.parent = { projectId: null, projectRef: resolvedProjectRef };
      proposal.requiresProject = true;
    } else if (
      parentProjectRef(proposal) &&
      !projectProposals.some(
        (projectProposal) => projectProposal.ref === parentProjectRef(proposal)
      )
    ) {
      proposal.parent = { projectId: null, projectRef: resolvedProjectRef };
    }

    if (
      proposal.objectType === "note" &&
      !proposal.attachment?.id &&
      !proposal.attachment?.ref
    ) {
      proposal.attachment = {
        type: "project",
        id: null,
        ref: resolvedProjectRef,
      };
    }
  }

  const hasChild = proposals.some(
    (proposal) =>
      proposal.segmentRef === route.segmentRef &&
      proposal.operationType !== "no_action" &&
      proposal.objectType !== "project"
  );
  const noteRef = `note_${route.segmentRef}`;
  if (!hasChild && !seenRefs.has(noteRef)) {
    proposals.push(
      buildSynthesizedNoteProposal(segment, route.segmentRef, resolvedProjectRef)
    );
    seenRefs.add(noteRef);
    warnings.push(
      `Synthesized Note proposal for new_project segment ${route.segmentRef}`
    );
  }
}

export function parseActiveNoteAIOutput(raw: unknown): ActiveNoteAIOutput {
  return activeNoteAIOutputSchema.parse(raw) as ActiveNoteAIOutput;
}

function prefilterUnsupportedProposals(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const output = raw as Record<string, unknown>;
  const proposals = Array.isArray(output.proposals) ? output.proposals : [];
  const filtered = [];

  for (const proposal of proposals) {
    if (!proposal || typeof proposal !== "object") continue;
    const item = proposal as Record<string, unknown>;
    if (
      typeof item.operationType !== "string" ||
      !SUPPORTED_OPERATION_TYPES.has(item.operationType)
    ) {
      continue;
    }
    if (
      typeof item.objectType !== "string" ||
      !SUPPORTED_OBJECT_TYPES.has(item.objectType)
    ) {
      continue;
    }
    filtered.push(item);
  }

  return {
    ...output,
    proposals: filtered,
  };
}

function incompleteAnalysisResult(
  parsed: ActiveNoteAIOutput,
  warnings: string[],
  candidateProjects: ActiveNoteCandidateProject[]
): ActiveNoteAIOutput {
  return {
    routing: {
      destination: "no_action",
      projectId: null,
      relatedTaskId: null,
      reason: "Analysis incomplete: model response missing required titles or segments",
      confidence: 0.5,
    },
    impact: null,
    summary: parsed.summary.trim(),
    segments: [],
    routes: [],
    proposals: [],
    candidateProjects,
    warnings: uniqueStrings(warnings),
  };
}

function normalizeRouting(
  routing: ActiveNoteRoutingDecision,
  allowedProjectIds: Set<string>,
  taskProjectMap: Map<string, string>,
  segmentMatch: ReturnType<typeof resolveSegmentMatch>,
  hasCatalogProjects: boolean,
  warnings: string[]
): ActiveNoteRoutingDecision {
  let projectId = routing.projectId?.trim() || null;
  let relatedTaskId = routing.relatedTaskId?.trim() || null;
  let destination = routing.destination;
  let reason = routing.reason.trim();
  let confidence = routing.confidence;

  if (destination === "no_action") {
    warnings.push(
      "Remapped no_action using segment match (mandatory note logging)"
    );
    return {
      destination: segmentMatch.destination,
      projectId: segmentMatch.projectId,
      relatedTaskId: null,
      reason: segmentMatch.reason,
      confidence: segmentMatch.confidence,
    };
  }

  if (
    destination === "existing_project" &&
    confidence < ACTIVE_NOTE_EXISTING_PROJECT_MATCH_CONFIDENCE_FLOOR
  ) {
    warnings.push(
      `existing_project confidence ${confidence} below match floor ${ACTIVE_NOTE_EXISTING_PROJECT_MATCH_CONFIDENCE_FLOOR}; routed to new_project`
    );
    return {
      destination: "new_project",
      projectId: null,
      relatedTaskId: null,
      reason: reason || "Segment does not meet existing-project match confidence",
      confidence: Math.max(confidence, 0.55),
    };
  }

  if (destination === "idea_only" && hasCatalogProjects) {
    warnings.push(
      "Remapped idea_only using segment match for mandatory project association"
    );
    return {
      destination: segmentMatch.destination,
      projectId: segmentMatch.projectId,
      relatedTaskId: null,
      reason: segmentMatch.reason,
      confidence: segmentMatch.confidence,
    };
  }

  if (destination === "existing_project") {
    if (!projectId || !allowedProjectIds.has(projectId)) {
      if (
        segmentMatch.destination === "existing_project" &&
        segmentMatch.projectId
      ) {
        warnings.push(
          `Routing existing_project lacked a valid projectId; rematched to ${segmentMatch.projectId}`
        );
        return {
          destination: "existing_project",
          projectId: segmentMatch.projectId,
          relatedTaskId: null,
          reason: reason || segmentMatch.reason,
          confidence: Math.max(confidence, segmentMatch.confidence),
        };
      }
      warnings.push(
        "Routing existing_project lacked a valid projectId; routed to new_project"
      );
      return {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason: "No valid existing project match after validation",
        confidence: Math.max(confidence, 0.55),
      };
    }
  } else if (projectId && !allowedProjectIds.has(projectId)) {
    warnings.push(`Removed invalid routing projectId: ${projectId}`);
    projectId = null;
  }

  if (relatedTaskId) {
    const taskProjectId = taskProjectMap.get(relatedTaskId);
    if (!taskProjectId) {
      warnings.push(`Removed invalid relatedTaskId: ${relatedTaskId}`);
      relatedTaskId = null;
    } else if (projectId && taskProjectId !== projectId) {
      warnings.push(
        "Removed relatedTaskId that does not belong to the routed project"
      );
      relatedTaskId = null;
    } else if (!projectId && destination === "existing_project") {
      projectId = taskProjectId;
    }
  }

  if (destination === "new_project") {
    relatedTaskId = null;
  }

  return {
    destination,
    projectId,
    relatedTaskId,
    reason,
    confidence,
  };
}

function isConsistentWithRouting(
  proposal: ActiveNoteProposal,
  routing: ActiveNoteRoutingDecision
): boolean {
  if (routing.destination === "no_action") {
    return proposal.operationType === "no_action";
  }

  // Destination is already narrowed away from no_action above.
  if (proposal.operationType === "no_action") {
    return false;
  }

  if (routing.destination === "existing_project") {
    if (proposal.objectType === "project") return false;
  }

  if (routing.destination === "new_project") {
    // Allow project + children + person
    return true;
  }

  if (routing.destination === "idea_only") {
    return proposal.objectType === "idea" || proposal.objectType === "person";
  }

  return true;
}

export function normalizeActiveNoteAIOutput(input: {
  raw: unknown;
  sourceText: string;
  allowedProjectIds: Set<string>;
  taskProjectMap?: Map<string, string>;
  fallbackCandidateProjects?: ActiveNoteCandidateProject[];
}): ActiveNoteAIOutput {
  const warnings: string[] = [];
  const taskProjectMap = input.taskProjectMap ?? new Map<string, string>();
  const prefiltered = prefilterUnsupportedProposals(input.raw);

  let parsed: ActiveNoteAIOutput;
  try {
    parsed = parseActiveNoteAIOutput(prefiltered);
  } catch {
    throw new Error("AI response did not match the required schema");
  }

  warnings.push(...parsed.warnings);

  const normalizedCandidates: ActiveNoteCandidateProject[] = [];
  for (const candidate of parsed.candidateProjects) {
    if (!input.allowedProjectIds.has(candidate.id)) continue;
    normalizedCandidates.push({
      id: candidate.id,
      title: candidate.title,
      relevanceReason: candidate.relevanceReason,
    });
  }
  if (
    normalizedCandidates.length === 0 &&
    input.fallbackCandidateProjects &&
    input.fallbackCandidateProjects.length > 0
  ) {
    for (const candidate of input.fallbackCandidateProjects) {
      if (!input.allowedProjectIds.has(candidate.id)) continue;
      normalizedCandidates.push({
        id: candidate.id,
        title: candidate.title,
        relevanceReason: candidate.relevanceReason,
      });
    }
  }

  const candidatePool =
    normalizedCandidates.length > 0
      ? normalizedCandidates
      : (input.fallbackCandidateProjects ?? []);

  const segments = normalizeSegments(
    parsed.segments,
    input.sourceText,
    warnings
  );
  if (segments.length === 0) {
    return incompleteAnalysisResult(parsed, warnings, normalizedCandidates);
  }
  const multiSegment = segments.length > 1;

  const rawRoutes = normalizeRawRoutes(
    parsed.routes,
    segments,
    candidatePool,
    input.allowedProjectIds,
    parsed.routing,
    parsed.impact,
    warnings
  );

  const routes: ActiveNoteSegmentRoute[] = [];
  const hasCatalogProjects = candidatePool.some((candidate) =>
    input.allowedProjectIds.has(candidate.id)
  );
  for (const rawRoute of rawRoutes) {
    const segment = segments.find((item) => item.ref === rawRoute.segmentRef);
    const segmentMatch = resolveSegmentMatch(
      segment?.text ?? input.sourceText,
      segment?.subject ?? noteTitleFromSource(input.sourceText),
      candidatePool,
      input.allowedProjectIds
    );
    const normalized = normalizeRouting(
      routingDecisionFromRoute(rawRoute),
      input.allowedProjectIds,
      taskProjectMap,
      segmentMatch,
      hasCatalogProjects,
      warnings
    );
    routes.push({
      segmentRef: rawRoute.segmentRef,
      destination: normalized.destination,
      projectId: normalized.projectId,
      relatedTaskId: normalized.relatedTaskId,
      reason: normalized.reason,
      confidence: normalized.confidence,
      impact:
        normalized.destination === "existing_project"
          ? rawRoute.impact ?? null
          : null,
    });
  }

  const routeBySegment = new Map(
    routes.map((route) => [route.segmentRef, route])
  );
  let { routing, impact } = deriveSummaryRouting(routes, segments);

  const projectRefs = new Set<string>();
  const taskRefs = new Set<string>();
  const seenRefs = new Set<string>();

  for (const proposal of parsed.proposals) {
    if (proposal.objectType === "project" && proposal.ref) {
      projectRefs.add(proposal.ref);
    }
    if (proposal.objectType === "task" && proposal.ref) {
      taskRefs.add(proposal.ref);
    }
  }

  const proposals: ActiveNoteProposal[] = [];

  for (const proposal of parsed.proposals) {
    if (!proposal.ref?.trim()) {
      warnings.push("Removed proposal without ref");
      continue;
    }
    if (seenRefs.has(proposal.ref)) {
      warnings.push(`Removed duplicate proposal ref: ${proposal.ref}`);
      continue;
    }
    seenRefs.add(proposal.ref);

    const segmentRef = resolveProposalSegmentRef(
      proposal,
      segments,
      multiSegment,
      warnings
    );
    if (!segmentRef) {
      warnings.push(`Removed ${proposal.ref}: missing segment assignment`);
      continue;
    }
    const segment = segments.find((item) => item.ref === segmentRef);
    const repairedProposal = repairProposalFromSegment(
      proposal,
      segment,
      input.sourceText,
      warnings
    );
    const segmentRoute = routeBySegment.get(segmentRef);
    const proposalRouting = segmentRoute
      ? routingDecisionFromRoute(segmentRoute)
      : routing;

    if (!isConsistentWithRouting(repairedProposal, proposalRouting)) {
      warnings.push(
        `Removed ${repairedProposal.objectType} proposal inconsistent with ${proposalRouting.destination} routing`
      );
      continue;
    }

    if (!hasUsablePayload(repairedProposal)) {
      warnings.push(
        hasRequiredLlmTitle(repairedProposal)
          ? `Removed ${repairedProposal.objectType} proposal ${repairedProposal.ref} with empty payload`
          : `Removed ${repairedProposal.objectType} proposal ${repairedProposal.ref}: missing LLM title`
      );
      continue;
    }

    let next: ActiveNoteProposal = {
      ...repairedProposal,
      ref: repairedProposal.ref.trim(),
      reason: repairedProposal.reason.trim(),
      evidence: uniqueStrings(repairedProposal.evidence),
      segmentRef,
      payload: { ...repairedProposal.payload },
      parent: repairedProposal.parent
        ? {
            projectId: repairedProposal.parent.projectId ?? null,
            projectRef: repairedProposal.parent.projectRef ?? null,
          }
        : null,
      attachment: repairedProposal.attachment
        ? {
            type: repairedProposal.attachment.type,
            id: repairedProposal.attachment.id ?? null,
            ref: repairedProposal.attachment.ref ?? null,
          }
        : null,
    };

    // Preserve attach_context as Note create semantics for apply/UI.
    if (next.operationType === "attach_context") {
      next = {
        ...next,
        operationType: "create",
        objectType: "note",
      };
      if (!next.attachment && proposalRouting.relatedTaskId) {
        next.attachment = {
          type: "task",
          id: proposalRouting.relatedTaskId,
          ref: null,
        };
      } else if (!next.attachment && proposalRouting.projectId) {
        next.attachment = {
          type: "project",
          id: proposalRouting.projectId,
          ref: null,
        };
      }
    }

    if (next.operationType === "no_action") {
      proposals.push({
        ...next,
        requiresProject: false,
        suggestedProjectId: null,
        parent: null,
        attachment: null,
      });
      continue;
    }

    if (next.objectType === "person" && isVaguePersonReference(input.sourceText, next)) {
      warnings.push("Removed vague person proposal");
      continue;
    }

    const hadExplicitParent = Boolean(
      parentProjectId(next) || parentProjectRef(next)
    );
    const hadExplicitAttachment = Boolean(
      next.attachment?.id || next.attachment?.ref
    );

    // Parent project validation for scoped types.
    if (PROJECT_SCOPED_TYPES.has(next.objectType)) {
      let projectId = parentProjectId(next);
      let projectRef = parentProjectRef(next);

      if (projectId && !input.allowedProjectIds.has(projectId)) {
        warnings.push(`Removed invalid parent.projectId on ${next.ref}`);
        projectId = null;
      }

      if (projectRef && !projectRefs.has(projectRef)) {
        warnings.push(`Removed invalid parent.projectRef on ${next.ref}`);
        projectRef = null;
      }

      // Resolve project from a valid attachment when parent is missing/invalid.
      if (!projectId && !projectRef && next.attachment?.id) {
        if (next.attachment.type === "task") {
          projectId = taskProjectMap.get(next.attachment.id) ?? null;
        } else if (
          input.allowedProjectIds.has(next.attachment.id) ||
          next.attachment.id === proposalRouting.projectId
        ) {
          projectId = next.attachment.id;
        }
      }

      // Auto-fill project from routing for project-scoped objects (including Notes).
      if (
        !projectId &&
        !projectRef &&
        proposalRouting.destination === "existing_project" &&
        proposalRouting.projectId
      ) {
        projectId = proposalRouting.projectId;
      }

      if (!projectId && !projectRef) {
        if (
          next.objectType === "idea" &&
          proposalRouting.destination === "idea_only"
        ) {
          // Allowed: idea awaiting project selection when no candidates exist.
          next = {
            ...next,
            parent: null,
            requiresProject: true,
            suggestedProjectId: null,
          };
        } else if (proposalRouting.destination === "new_project") {
          projectRef = segmentProjectRef(segmentRef);
          next = {
            ...next,
            parent: { projectId: null, projectRef },
            requiresProject: true,
            suggestedProjectId: null,
          };
          if (
            next.objectType === "note" &&
            !next.attachment?.id &&
            !next.attachment?.ref
          ) {
            next = {
              ...next,
              attachment: { type: "project", id: null, ref: projectRef },
            };
          }
        } else if (next.objectType === "note" && !hadExplicitAttachment) {
          if (
            proposalRouting.destination === "existing_project" &&
            proposalRouting.projectId
          ) {
            projectId = proposalRouting.projectId;
            next = {
              ...next,
              parent: { projectId, projectRef: null },
              requiresProject: true,
              suggestedProjectId: projectId,
              attachment: { type: "project", id: projectId, ref: null },
            };
          } else {
            warnings.push(
              "Kept note without attachment or project parent for user selection"
            );
            next = {
              ...next,
              parent: null,
              requiresProject: true,
              suggestedProjectId: null,
            };
          }
        } else {
          warnings.push(
            `Kept ${next.objectType} proposal without projectId or projectRef for user selection`
          );
          next = {
            ...next,
            parent: null,
            requiresProject: true,
            suggestedProjectId: null,
          };
        }
      } else {
        next = {
          ...next,
          parent: { projectId, projectRef },
          requiresProject: true,
          suggestedProjectId: resolveSuggestedProjectId(
            { ...next, parent: { projectId, projectRef } },
            proposalRouting
          ),
        };
        if (
          next.objectType === "note" &&
          !next.attachment?.id &&
          !next.attachment?.ref &&
          projectId
        ) {
          next = {
            ...next,
            attachment: { type: "project", id: projectId, ref: null },
          };
        }
      }
    } else {
      // Project / Person should not require a project parent.
      next = {
        ...next,
        parent: null,
        requiresProject: false,
        suggestedProjectId: null,
      };
    }

    // Attachment validation (notes / task context).
    if (next.attachment) {
      const attachment = { ...next.attachment };
      if (attachment.id) {
        if (attachment.type === "task") {
          const taskProjectId = taskProjectMap.get(attachment.id);
          if (!taskProjectId) {
            warnings.push(`Removed invalid task attachment id on ${next.ref}`);
            attachment.id = null;
          } else {
            // Ensure note still resolves to the task's project.
            if (
              PROJECT_SCOPED_TYPES.has(next.objectType) &&
              !parentProjectRef(next)
            ) {
              next = {
                ...next,
                parent: {
                  projectId: taskProjectId,
                  projectRef: null,
                },
                suggestedProjectId: taskProjectId,
              };
            }
          }
        } else if (
          attachment.type === "project" &&
          !input.allowedProjectIds.has(attachment.id) &&
          attachment.id !== proposalRouting.projectId
        ) {
          warnings.push(`Removed invalid project attachment id on ${next.ref}`);
          attachment.id = null;
        }
      }
      if (attachment.ref) {
        const ok =
          attachment.type === "task"
            ? taskRefs.has(attachment.ref)
            : projectRefs.has(attachment.ref);
        if (!ok) {
          warnings.push(`Removed invalid attachment ref on ${next.ref}`);
          attachment.ref = null;
        }
      }
      if (!attachment.id && !attachment.ref) {
        next = { ...next, attachment: null };
      } else {
        next = { ...next, attachment };
      }
    }

    // Generic note fallback: ensure notes have a parent or attachment when possible.
    if (next.objectType === "note") {
      const hasAttachment = Boolean(
        next.attachment?.id || next.attachment?.ref
      );
      const hasParent = Boolean(parentProjectId(next) || parentProjectRef(next));
      if (!hasAttachment && !hasParent) {
        if (proposalRouting.destination === "new_project") {
          const projectRef = segmentProjectRef(segmentRef);
          next = {
            ...next,
            parent: { projectId: null, projectRef },
            requiresProject: true,
            attachment: { type: "project", id: null, ref: projectRef },
          };
        } else if (
          proposalRouting.destination === "existing_project" &&
          proposalRouting.projectId
        ) {
          next = {
            ...next,
            parent: {
              projectId: proposalRouting.projectId,
              projectRef: null,
            },
            requiresProject: true,
            suggestedProjectId: proposalRouting.projectId,
            attachment: {
              type: "project",
              id: proposalRouting.projectId,
              ref: null,
            },
          };
        } else {
          warnings.push(
            "Kept note without attachment or project parent for user selection"
          );
          next = {
            ...next,
            parent: null,
            requiresProject: true,
            suggestedProjectId: null,
          };
        }
      }
      if (!hasAttachment && hadExplicitParent && !next.reason?.trim()) {
        warnings.push(
          "Downgraded generic project note: missing routing reason"
        );
      }

      const segment =
        segments.find((item) => item.ref === segmentRef) ?? null;
      const segmentText = segment?.text ?? input.sourceText;
      const existingTitle = next.payload.title?.trim() || "";
      const content = next.payload.content?.trim() || "";
      if (
        content.length > 0 &&
        existingTitle.toLowerCase() === content.toLowerCase()
      ) {
        warnings.push(`Note title duplicates content on ${next.ref}`);
      }
      if (!next.payload.content?.trim()) {
        next = {
          ...next,
          payload: {
            ...next.payload,
            content: segmentText.trim(),
          },
        };
      }
    }

    if (next.payload.dueDate) {
      if (!dueDateSupportedByText(input.sourceText, next.payload.dueDate)) {
        next = {
          ...next,
          payload: { ...next.payload, dueDate: null },
        };
      }
    }

    if (next.payload.priority) {
      if (!prioritySupportedByText(input.sourceText, next.payload.priority)) {
        const { priority: _priority, ...rest } = next.payload;
        next = { ...next, payload: rest };
      }
    }

    proposals.push(next);
    if (proposals.length >= ACTIVE_NOTE_MAX_PROPOSALS) {
      warnings.push(`Limited proposals to ${ACTIVE_NOTE_MAX_PROPOSALS}`);
      break;
    }
  }

  // Per-segment new_project packages must include exactly one Project proposal.
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
    const route = routes[routeIndex]!;
    if (route.destination !== "new_project") continue;

    const segment = segments.find((item) => item.ref === route.segmentRef);
    if (!segment) continue;

    ensureNewProjectPackage(proposals, route, segment, seenRefs, warnings);
  }

  // Drop children whose projectRef no longer exists after filtering.
  const finalProjectRefs = new Set(
    proposals.filter((p) => p.objectType === "project").map((p) => p.ref)
  );
  const finalTaskRefs = new Set(
    proposals.filter((p) => p.objectType === "task").map((p) => p.ref)
  );

  const reconciled: ActiveNoteProposal[] = [];
  for (const proposal of proposals) {
    const projectRef = parentProjectRef(proposal);
    if (projectRef && !finalProjectRefs.has(projectRef)) {
      const route = routeBySegment.get(proposal.segmentRef ?? "");
      if (route?.destination === "new_project") {
        const synthesizedRef = segmentProjectRef(route.segmentRef);
        warnings.push(
          `Remapped missing parent.projectRef on ${proposal.ref} to ${synthesizedRef}`
        );
        proposal.parent = { projectId: null, projectRef: synthesizedRef };
        if (
          proposal.objectType === "note" &&
          !proposal.attachment?.id &&
          !proposal.attachment?.ref
        ) {
          proposal.attachment = {
            type: "project",
            id: null,
            ref: synthesizedRef,
          };
        }
      } else {
        warnings.push(
          `Removed ${proposal.ref}: parent.projectRef no longer present`
        );
        continue;
      }
    }
    if (
      proposal.attachment?.ref &&
      proposal.attachment.type === "task" &&
      !finalTaskRefs.has(proposal.attachment.ref)
    ) {
      warnings.push(
        `Removed task attachment ref on ${proposal.ref}: task proposal missing`
      );
      proposal.attachment = {
        ...proposal.attachment,
        ref: null,
      };
    }
    reconciled.push(proposal);
  }

  // Ensure every segment has at least one actionable proposal.
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex += 1) {
    const route = routes[routeIndex]!;
    const segment =
      segments.find((item) => item.ref === route.segmentRef) ?? segments[0]!;
    const segmentProposals = reconciled.filter(
      (p) => p.segmentRef === route.segmentRef
    );
    if (hasActionableProposals(segmentProposals)) {
      continue;
    }

    if (route.destination === "new_project") {
      ensureNewProjectPackage(reconciled, route, segment, seenRefs, warnings);
      continue;
    }

    warnings.push(
      `Segment ${route.segmentRef} has no actionable proposals with LLM titles`
    );
  }

  ({ routing, impact } = deriveSummaryRouting(routes, segments));

  // Hard cap after segment fallbacks.
  const capped = reconciled.slice(0, ACTIVE_NOTE_MAX_PROPOSALS);
  if (reconciled.length > ACTIVE_NOTE_MAX_PROPOSALS) {
    warnings.push(`Limited proposals to ${ACTIVE_NOTE_MAX_PROPOSALS}`);
  }

  return {
    routing,
    impact,
    summary: parsed.summary.trim(),
    segments,
    routes,
    proposals: capped,
    candidateProjects: normalizedCandidates,
    warnings: uniqueStrings(warnings),
  };
}

/** Exported for focused unit tests. */
export const __testables = {
  isVaguePersonReference,
  dueDateSupportedByText,
  prioritySupportedByText,
  normalizeRouting,
  isConsistentWithRouting,
};
