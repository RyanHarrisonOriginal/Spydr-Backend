import { describe, expect, it, vi } from "vitest";
import {
  ActiveNoteAnalysisError,
  type ActiveNoteAIOutput,
  type ActiveNoteAIProvider,
} from "../../../active-notes/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { IProjectRepository } from "../../../interfaces/index.js";
import {
  AnalyzeActiveNoteQuery,
  AnalyzeActiveNoteQueryHandler,
} from "./analyze-active-note.query.js";

function makeProject(id: string, title: string): ProjectNode {
  return {
    id,
    orgId: "org-1",
    userId: "user-1",
    nodeType: "project",
    title,
    body: `${title} body`,
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    sortOrder: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    details: null,
    personas: null,
    tasks: [],
    decisions: [],
    ideas: [],
    notes: [],
    resources: [],
    deletedTasks: [],
    deletedDecisions: [],
    deletedIdeas: [],
    deletedNotes: [],
    deletedResources: [],
  } as unknown as ProjectNode;
}

describe("AnalyzeActiveNoteQueryHandler", () => {
  it("returns a safe error when the AI provider fails", async () => {
    const projects: IProjectRepository = {
      listByOrg: vi.fn(async () => [makeProject("proj-1", "Muay Thai Development")]),
      findByIdForOrg: vi.fn(async () => null),
    } as unknown as IProjectRepository;

    const aiProvider: ActiveNoteAIProvider = {
      analyze: vi.fn(async () => {
        throw new Error("upstream timeout");
      }),
    };

    const handler = new AnalyzeActiveNoteQueryHandler(projects, aiProvider);

    await expect(
      handler.execute(
        new AnalyzeActiveNoteQuery("user-1", "org-1", {
          content: "Practice teep setups before sparring.",
          projectId: null,
        })
      )
    ).rejects.toMatchObject({
      name: "ActiveNoteAnalysisError",
      message: "Active note analysis failed. Please try again.",
      statusCode: 502,
    });
  });

  it("analyzes content with a working provider and repairs invalid parent project ids", async () => {
    const project = makeProject("proj-1", "Muay Thai Development");
    const projects: IProjectRepository = {
      listByOrg: vi.fn(async () => [project]),
      findByIdForOrg: vi.fn(async () => project),
    } as unknown as IProjectRepository;

    const sourceText =
      "Last night I sparred a big guy and had problems landing a teep.";
    const aiOutput: ActiveNoteAIOutput = {
      routing: {
        destination: "existing_project",
        projectId: "proj-1",
        relatedTaskId: null,
        reason: "Matches selected project",
        confidence: 0.9,
      },
      impact: {
        type: "mixed",
        reason: "Observation with optional follow-up",
      },
      summary: "Sparring observation about teep difficulty.",
      segments: [
        {
          ref: "seg_1",
          text: sourceText,
          subject: "Teep Sparring",
        },
      ],
      routes: [
        {
          segmentRef: "seg_1",
          destination: "existing_project",
          projectId: "proj-1",
          relatedTaskId: null,
          reason: "Matches selected project",
          confidence: 0.9,
          impact: null,
        },
      ],
      proposals: [
        {
          ref: "note_1",
          operationType: "create",
          objectType: "note",
          parent: { projectId: "bogus-project", projectRef: null },
          attachment: { type: "project", id: "proj-1", ref: null },
          payload: {
            title: "Difficulty landing teeps against a larger opponent",
            content: sourceText,
          },
          explicitlyStated: true,
          confidence: 0.95,
          evidence: ["had problems landing a teep"],
          reason: "Project observation",
          segmentRef: "seg_1",
        },
        {
          ref: "task_1",
          operationType: "suggest_create",
          objectType: "task",
          parent: { projectId: "proj-1", projectRef: null },
          attachment: null,
          payload: {
            title: "Practice teep setups against larger opponents",
          },
          explicitlyStated: false,
          confidence: 0.7,
          evidence: ["had problems landing a teep"],
          reason: "Implied drill",
          segmentRef: "seg_1",
        },
      ],
      candidateProjects: [],
      warnings: [],
    };

    const aiProvider: ActiveNoteAIProvider = {
      analyze: vi.fn(async () => aiOutput),
    };

    const handler = new AnalyzeActiveNoteQueryHandler(projects, aiProvider);
    const result = await handler.execute(
      new AnalyzeActiveNoteQuery("user-1", "org-1", {
        content: sourceText,
        projectId: "proj-1",
      })
    );

    expect(aiProvider.analyze).toHaveBeenCalledOnce();
    expect(result.routing.destination).toBe("existing_project");
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(true);
    expect(result.proposals.some((p) => p.objectType === "person")).toBe(false);
    expect(
      result.proposals.find((p) => p.objectType === "note")?.parent?.projectId
    ).toBe("proj-1");
    expect(
      result.warnings.some((w) => /invalid parent\.projectId/i.test(w))
    ).toBe(true);
  });

  it("returns 404 when the selected project is outside the org", async () => {
    const projects: IProjectRepository = {
      listByOrg: vi.fn(async () => []),
      findByIdForOrg: vi.fn(async () => null),
    } as unknown as IProjectRepository;

    const handler = new AnalyzeActiveNoteQueryHandler(projects, {
      analyze: vi.fn(),
    });

    await expect(
      handler.execute(
        new AnalyzeActiveNoteQuery("user-1", "org-1", {
          content: "Practice teep setups before sparring.",
          projectId: "missing",
        })
      )
    ).rejects.toBeInstanceOf(ActiveNoteAnalysisError);
  });
});
