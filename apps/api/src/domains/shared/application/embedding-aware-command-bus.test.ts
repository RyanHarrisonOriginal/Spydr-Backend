import { describe, expect, it, vi } from "vitest";
import {
  EmbeddingAwareCommandBus,
  withoutProjectEmbeddingRefresh,
} from "./embedding-aware-command-bus.js";
import { CreateProjectCommand } from "../../projects/commands/create-project.command.js";
import type { ICommand, ICommandHandler } from "./command.js";
import type { ProjectNode } from "../../projects/models/index.js";

class StubCreateProjectHandler
  implements ICommandHandler<CreateProjectCommand, ProjectNode>
{
  readonly commandType = CreateProjectCommand.commandType;

  async execute(): Promise<ProjectNode> {
    return { id: "project-1" } as ProjectNode;
  }
}

describe("EmbeddingAwareCommandBus", () => {
  it("enqueues after a successful tracked mutation", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const bus = new EmbeddingAwareCommandBus({
      repositories: {} as never,
      prisma: {} as never,
      enqueue,
    });
    bus.register(new StubCreateProjectHandler());

    const result = await bus.execute(
      new CreateProjectCommand("user-1", "org-1", { title: "Launch" })
    );

    expect(result).toEqual({ id: "project-1" });
    expect(enqueue).toHaveBeenCalledWith("project-1");
  });

  it("does not fail the mutation when enqueue throws", async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error("Redis unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const bus = new EmbeddingAwareCommandBus({
      repositories: {} as never,
      prisma: {} as never,
      enqueue,
    });
    bus.register(new StubCreateProjectHandler());

    await expect(
      bus.execute(new CreateProjectCommand("user-1", "org-1", { title: "Launch" }))
    ).resolves.toEqual({ id: "project-1" });

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });
    consoleError.mockRestore();
  });

  it("does not enqueue for untracked commands", async () => {
    const enqueue = vi.fn();
    const innerExecute = vi.fn().mockResolvedValue("ok");
    const bus = new EmbeddingAwareCommandBus({
      inner: { register: vi.fn(), registerMany: vi.fn(), execute: innerExecute },
      repositories: {} as never,
      prisma: {} as never,
      enqueue,
    });

    const command: ICommand<string> = {
      commandType: "organizations.create",
      userId: "user-1",
      orgId: "org-1",
    };

    await expect(bus.execute(command)).resolves.toBe("ok");
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("does not enqueue while project embedding refresh is suppressed", async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const bus = new EmbeddingAwareCommandBus({
      repositories: {} as never,
      prisma: {} as never,
      enqueue,
    });
    bus.register(new StubCreateProjectHandler());

    await withoutProjectEmbeddingRefresh(async () => {
      await expect(
        bus.execute(new CreateProjectCommand("user-1", "org-1", { title: "Launch" }))
      ).resolves.toEqual({ id: "project-1" });
    });

    expect(enqueue).not.toHaveBeenCalled();
  });
});
