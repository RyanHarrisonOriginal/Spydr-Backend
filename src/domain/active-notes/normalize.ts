import { activeNoteAIOutputSchema } from "./schemas.js";
import {
  ACTIVE_NOTE_MAX_PROPOSALS,
  type ActiveNoteAIOutput,
  type ActiveNoteCandidateProject,
  type ActiveNoteObjectType,
  type ActiveNoteProposal,
  type ActiveNoteRoutingDecision,
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

function hasUsablePayload(proposal: ActiveNoteProposal): boolean {
  if (proposal.operationType === "no_action") return true;
  const { payload, objectType } = proposal;
  if (objectType === "person") {
    return Boolean(payload.name?.trim() || payload.title?.trim());
  }
  return Boolean(
    payload.title?.trim() ||
      payload.content?.trim() ||
      payload.description?.trim() ||
      payload.rationale?.trim()
  );
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

function noActionProposal(): ActiveNoteProposal {
  return {
    ref: "no_action_1",
    operationType: "no_action",
    objectType: "note",
    parent: null,
    attachment: null,
    payload: {
      title: "No action",
      description: "No useful Spydr change should result from this note.",
    },
    explicitlyStated: false,
    confidence: 1,
    evidence: [],
    reason: "No useful execution change detected",
    requiresProject: false,
    suggestedProjectId: null,
  };
}

function normalizeRouting(
  routing: ActiveNoteRoutingDecision,
  allowedProjectIds: Set<string>,
  taskProjectMap: Map<string, string>,
  warnings: string[]
): ActiveNoteRoutingDecision {
  let projectId = routing.projectId?.trim() || null;
  let relatedTaskId = routing.relatedTaskId?.trim() || null;
  let destination = routing.destination;

  if (destination === "existing_project") {
    if (!projectId || !allowedProjectIds.has(projectId)) {
      warnings.push(
        "Routing existing_project lacked a valid candidate projectId; downgraded to no_action"
      );
      return {
        destination: "no_action",
        projectId: null,
        relatedTaskId: null,
        reason: "No valid existing project match after validation",
        confidence: Math.min(routing.confidence, 0.4),
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
    reason: routing.reason.trim(),
    confidence: routing.confidence,
  };
}

function isConsistentWithRouting(
  proposal: ActiveNoteProposal,
  routing: ActiveNoteRoutingDecision
): boolean {
  if (routing.destination === "no_action") {
    return proposal.operationType === "no_action";
  }

  if (proposal.operationType === "no_action") {
    return routing.destination === "no_action";
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
    normalizedCandidates.push(...input.fallbackCandidateProjects);
  }

  const routing = normalizeRouting(
    parsed.routing,
    input.allowedProjectIds,
    taskProjectMap,
    warnings
  );

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

    if (!isConsistentWithRouting(proposal, routing)) {
      warnings.push(
        `Removed ${proposal.objectType} proposal inconsistent with ${routing.destination} routing`
      );
      continue;
    }

    if (!hasUsablePayload(proposal)) {
      warnings.push(`Removed ${proposal.objectType} proposal with empty payload`);
      continue;
    }

    let next: ActiveNoteProposal = {
      ...proposal,
      ref: proposal.ref.trim(),
      reason: proposal.reason.trim(),
      evidence: uniqueStrings(proposal.evidence),
      payload: { ...proposal.payload },
      parent: proposal.parent
        ? {
            projectId: proposal.parent.projectId ?? null,
            projectRef: proposal.parent.projectRef ?? null,
          }
        : null,
      attachment: proposal.attachment
        ? {
            type: proposal.attachment.type,
            id: proposal.attachment.id ?? null,
            ref: proposal.attachment.ref ?? null,
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
      if (!next.attachment && routing.relatedTaskId) {
        next.attachment = {
          type: "task",
          id: routing.relatedTaskId,
          ref: null,
        };
      } else if (!next.attachment && routing.projectId) {
        next.attachment = {
          type: "project",
          id: routing.projectId,
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
          next.attachment.id === routing.projectId
        ) {
          projectId = next.attachment.id;
        }
      }

      // Auto-fill project from routing for tasks/decisions/ideas, not bare notes.
      if (
        !projectId &&
        !projectRef &&
        next.objectType !== "note" &&
        routing.destination === "existing_project" &&
        routing.projectId
      ) {
        projectId = routing.projectId;
      }

      if (!projectId && !projectRef) {
        if (
          next.objectType === "idea" &&
          routing.destination === "idea_only"
        ) {
          // Allowed: idea awaiting project selection.
          next = {
            ...next,
            parent: null,
            requiresProject: true,
            suggestedProjectId: null,
          };
        } else if (next.objectType === "note" && !hadExplicitAttachment) {
          warnings.push(
            "Removed generic note without attachment or project parent"
          );
          continue;
        } else {
          warnings.push(
            `Removed ${next.objectType} proposal without projectId or projectRef`
          );
          continue;
        }
      } else {
        next = {
          ...next,
          parent: { projectId, projectRef },
          requiresProject: true,
          suggestedProjectId: resolveSuggestedProjectId(
            { ...next, parent: { projectId, projectRef } },
            routing
          ),
        };
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
          attachment.id !== routing.projectId
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

    // Generic note fallback rejection: notes need explicit parent or attachment.
    if (next.objectType === "note") {
      const hasAttachment = Boolean(
        next.attachment?.id || next.attachment?.ref
      );
      if (!hasAttachment && !hadExplicitParent) {
        warnings.push(
          "Removed generic note without attachment or project parent"
        );
        continue;
      }
      if (!hasAttachment && hadExplicitParent && !next.reason?.trim()) {
        warnings.push(
          "Downgraded generic project note: missing routing reason"
        );
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

    if (next.evidence.length === 0 && next.operationType !== "no_action") {
      warnings.push(`Removed ${next.objectType} proposal without evidence`);
      continue;
    }

    proposals.push(next);
    if (proposals.length >= ACTIVE_NOTE_MAX_PROPOSALS) {
      warnings.push(`Limited proposals to ${ACTIVE_NOTE_MAX_PROPOSALS}`);
      break;
    }
  }

  // new_project must include exactly one Project proposal.
  if (routing.destination === "new_project") {
    const projectProposals = proposals.filter((p) => p.objectType === "project");
    if (projectProposals.length === 0) {
      warnings.push(
        "new_project routing had no Project proposal; downgraded to no_action"
      );
      return {
        routing: {
          destination: "no_action",
          projectId: null,
          relatedTaskId: null,
          reason: "New project routing lacked a Project proposal",
          confidence: Math.min(routing.confidence, 0.4),
        },
        impact: null,
        summary: parsed.summary.trim(),
        proposals: [noActionProposal()],
        candidateProjects: normalizedCandidates,
        warnings: uniqueStrings(warnings),
      };
    }
    if (projectProposals.length > 1) {
      const keep = projectProposals[0]!.ref;
      const filtered = proposals.filter(
        (p) => p.objectType !== "project" || p.ref === keep
      );
      warnings.push("Kept only one Project proposal for new_project routing");
      proposals.length = 0;
      proposals.push(...filtered);
    }
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
      warnings.push(
        `Removed ${proposal.ref}: parent.projectRef no longer present`
      );
      continue;
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

  if (reconciled.length === 0 || routing.destination === "no_action") {
    if (routing.destination === "no_action") {
      return {
        routing,
        impact: null,
        summary: parsed.summary.trim(),
        proposals: [noActionProposal()],
        candidateProjects: normalizedCandidates,
        warnings: uniqueStrings(warnings),
      };
    }
  }

  if (reconciled.length === 0) {
    return {
      routing: {
        destination: "no_action",
        projectId: null,
        relatedTaskId: null,
        reason: "No valid proposals remained after normalization",
        confidence: 0.5,
      },
      impact: null,
      summary: parsed.summary.trim(),
      proposals: [noActionProposal()],
      candidateProjects: normalizedCandidates,
      warnings: uniqueStrings(warnings),
    };
  }

  const impact =
    routing.destination === "existing_project" ? parsed.impact ?? null : null;

  return {
    routing,
    impact,
    summary: parsed.summary.trim(),
    proposals: reconciled,
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
