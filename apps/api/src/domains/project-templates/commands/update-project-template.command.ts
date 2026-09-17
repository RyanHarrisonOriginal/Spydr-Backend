import type { IProjectTemplateRepository } from "../repository.js";
import type { IProjectRepository } from "../../projects/repository.js";
import type { IProjectViews } from "../../projects/views.js";
import type { IProjectAreaViews } from "../../project-areas/views.js";
import type {
  IProjectTemplateUpdateInput,
  ProjectTemplate,
} from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import { applyTemplateSyncToProject } from "../utils/sync-spawned-project.js";

export class UpdateProjectTemplateCommand implements ICommand<ProjectTemplate> {
  static readonly commandType = "project-templates.update";
  readonly commandType = UpdateProjectTemplateCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string,
    readonly input: IProjectTemplateUpdateInput,
    readonly spawnedParamValues: Record<string, Record<string, string>> = {}
  ) {}
}

export class UpdateProjectTemplateCommandHandler
  implements ICommandHandler<UpdateProjectTemplateCommand, ProjectTemplate>
{
  readonly commandType = UpdateProjectTemplateCommand.commandType;

  constructor(
    private readonly templates: IProjectTemplateRepository,
    private readonly projects: IProjectRepository,
    private readonly projectViews: IProjectViews,
    private readonly projectAreaViews: IProjectAreaViews
  ) {}

  async execute(command: UpdateProjectTemplateCommand): Promise<ProjectTemplate> {
    const template = await this.templates.get({
      id: command.templateId,
      orgId: command.orgId,
    });
    if (!template) {
      throw new Error("Project template not found");
    }

    const keys = Object.keys(command.input);
    if (keys.length === 0) {
      throw new Error("Nothing to update");
    }

    template.applyUpdate(command.input);
    const saved = await this.templates.save(template);

    const areaNode = saved.area
      ? await this.projectAreaViews.getByTitle(command.orgId, saved.area)
      : null;

    const spawned = await this.projectViews.listOpenBySourceTemplate(
      command.orgId,
      saved.id
    );

    for (const summary of spawned) {
      const project = await this.projects.get({
        id: summary.id,
        orgId: command.orgId,
      });
      if (!project || !project.isOpenForTemplateSync()) continue;

      applyTemplateSyncToProject(project, saved, {
        paramValues: command.spawnedParamValues[summary.id] ?? {},
      });
      await this.projects.save(project);
      await this.projects.save(project, {
        strategy: "withAreaAssignment",
        context: { areaNodeId: areaNode?.id ?? null },
      });
    }

    return saved;
  }
}
