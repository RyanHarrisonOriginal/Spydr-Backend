import type { IProjectRepository } from "../../projects/repository.js";
import type { IProjectTemplateRepository } from "../repository.js";
import {
  ProjectTemplateMapper,
  type ICreateProjectTemplateFromProjectInput,
} from "../mappers/index.js";
import type { ProjectTemplate } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { SpydrNodeStatus } from "../../shared/models/shared.js";

export class CreateProjectTemplateFromProjectCommand
  implements ICommand<ProjectTemplate>
{
  static readonly commandType = "project-templates.createFromProject";
  readonly commandType = CreateProjectTemplateFromProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly input: ICreateProjectTemplateFromProjectInput
  ) {}
}

export class CreateProjectTemplateFromProjectCommandHandler
  implements
    ICommandHandler<CreateProjectTemplateFromProjectCommand, ProjectTemplate>
{
  readonly commandType = CreateProjectTemplateFromProjectCommand.commandType;

  constructor(
    private readonly templates: IProjectTemplateRepository,
    private readonly projects: IProjectRepository,
    private readonly mapper = new ProjectTemplateMapper()
  ) {}

  async execute(
    command: CreateProjectTemplateFromProjectCommand
  ): Promise<ProjectTemplate> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const template = this.mapper.toModelFromProject(
      command.userId,
      command.orgId,
      {
        id: project.id,
        title: project.title,
        body: project.body,
        status: project.status,
        priority: project.priority,
        area: project.area,
        tags: project.tags,
        outcome: project.details?.outcome ?? null,
        riskLevel: project.details?.riskLevel ?? "medium",
        tasks: project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          body: task.body,
          status: task.status as SpydrNodeStatus,
          priority: task.priority,
          tags: task.details?.tags?.length ? task.details.tags : task.tags,
          estimatedMinutes: task.details?.estimatedMinutes ?? null,
        })),
      },
      command.input
    );

    return this.templates.save(template);
  }
}
