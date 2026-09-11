import type { IProjectAreaRepository } from "../../project-areas/repository.js";
import type { IProjectRepository } from "../../projects/repository.js";
import type { IProjectTemplateViews } from "../views.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { ProjectMapper } from "../../projects/mappers/index.js";
import { TaskMapper } from "../../tasks/mappers/index.js";
import type { ProjectNode } from "../../projects/models/index.js";
import {
  assertFullyRendered,
  renderTemplate,
  validateParamValues,
} from "../utils/interpolate.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { TaskStatus } from "../../shared/models/shared.js";

export interface IInvokeProjectTemplateInput {
  parameters: Record<string, string>;
  areaNodeId?: string | null;
}

export class InvokeProjectTemplateCommand implements ICommand<ProjectNode> {
  static readonly commandType = "project-templates.invoke";
  readonly commandType = InvokeProjectTemplateCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string,
    readonly input: IInvokeProjectTemplateInput
  ) {}
}

export class InvokeProjectTemplateCommandHandler
  implements ICommandHandler<InvokeProjectTemplateCommand, ProjectNode>
{
  readonly commandType = InvokeProjectTemplateCommand.commandType;

  constructor(
    private readonly templateViews: IProjectTemplateViews,
    private readonly projects: IProjectRepository,
    private readonly projectAreas: IProjectAreaRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly projectMapper = new ProjectMapper(),
    private readonly taskMapper = new TaskMapper()
  ) {}

  async execute(command: InvokeProjectTemplateCommand): Promise<ProjectNode> {
    const template = await this.templateViews.getDetail(
      command.orgId,
      command.templateId
    );
    if (!template || template.isArchived) {
      throw new Error("Project template not found");
    }

    const params = validateParamValues(
      template.parameters.map((p) => ({
        key: p.key,
        required: p.required,
        defaultValue: p.defaultValue,
      })),
      command.input.parameters ?? {}
    );

    const title = renderTemplate(template.titleTemplate, params);
    const body = renderTemplate(template.bodyTemplate, params);
    const outcome = template.outcomeTemplate
      ? renderTemplate(template.outcomeTemplate, params)
      : null;
    const tags = template.tags.map((tag) => renderTemplate(tag, params));

    assertFullyRendered("title", title);
    assertFullyRendered("body", body);
    if (outcome) assertFullyRendered("outcome", outcome);
    tags.forEach((tag, i) => assertFullyRendered(`tag[${i}]`, tag));

    let area = template.area;
    const areaNodeId = command.input.areaNodeId;
    if (areaNodeId) {
      const areaNode = await this.projectAreas.get({
        id: areaNodeId,
        orgId: command.orgId,
      });
      if (!areaNode) throw new Error("Project area not found");
      area = areaNode.title;
    }

    const projectSort = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "project"
    );
    const project = this.projectMapper.toModel(
      command.userId,
      command.orgId,
      {
        title,
        body,
        status: template.status,
        priority: template.priority,
        area,
        tags,
        outcome,
        riskLevel: template.riskLevel,
      },
      new Date(),
      projectSort
    );

    let taskSort = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "task"
    );

    const invokeDay = new Date();
    const dateOnly = invokeDay.toISOString().slice(0, 10);

    for (const templateTask of [...template.tasks].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )) {
      const taskTitle = renderTemplate(templateTask.titleTemplate, params);
      const taskBody = renderTemplate(templateTask.bodyTemplate, params);
      const taskTags = templateTask.tags.map((tag) =>
        renderTemplate(tag, params)
      );
      assertFullyRendered("task title", taskTitle);
      assertFullyRendered("task body", taskBody);
      taskTags.forEach((tag, i) =>
        assertFullyRendered(`task tag[${i}]`, tag)
      );

      let dueDate: string | null = null;
      if (templateTask.dueOffsetDays != null) {
        const due = new Date(`${dateOnly}T00:00:00.000Z`);
        due.setUTCDate(due.getUTCDate() + templateTask.dueOffsetDays);
        dueDate = due.toISOString().slice(0, 10);
      }

      const task = this.taskMapper.toModel(
        {
          title: taskTitle,
          body: taskBody,
          status: templateTask.status as TaskStatus,
          priority: templateTask.priority,
          dueDate,
          estimatedMinutes: templateTask.estimatedMinutes,
        },
        {
          userId: command.userId,
          orgId: command.orgId,
          area: project.area,
          sortOrder: taskSort,
        }
      );
      if (taskTags.length > 0) {
        task.tags = taskTags;
        if (task.details) {
          task.details.tags = taskTags;
        }
      }
      project.addTask(task);
      taskSort += 1000;
    }

    const saved = await this.projects.save(project);

    if (areaNodeId) {
      await this.projects.save(saved, {
        strategy: "withAreaAssignment",
        context: { areaNodeId },
      });
    }

    return (
      (await this.projects.get({ id: saved.id, orgId: command.orgId })) ?? saved
    );
  }
}
