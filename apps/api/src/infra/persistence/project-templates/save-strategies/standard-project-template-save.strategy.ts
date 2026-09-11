import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../../domains/shared/save-strategy.js";
import type { ProjectTemplate } from "../../../../domains/project-templates/models/index.js";
import {
  PrismaProjectTemplateMapper,
  type ProjectTemplateRow,
} from "../prisma-project-template.mapper.js";

export class StandardProjectTemplateSaveStrategy
  implements ISaveStrategy<ProjectTemplate, unknown>
{
  readonly key = "standard";

  constructor(private readonly mapper = new PrismaProjectTemplateMapper()) {}

  async save(
    entity: ProjectTemplate,
    _context: unknown,
    db: PrismaClient
  ): Promise<ProjectTemplate> {
    const data = this.mapper.toPersistence(entity);

    const row = await db.$transaction(async (tx) => {
      await tx.spydrProjectTemplate.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          orgId: data.orgId,
          createdByUserId: data.createdByUserId,
          name: data.name,
          description: data.description,
          titleTemplate: data.titleTemplate,
          bodyTemplate: data.bodyTemplate,
          outcomeTemplate: data.outcomeTemplate,
          status: data.status,
          priority: data.priority,
          riskLevel: data.riskLevel,
          area: data.area,
          tags: data.tags,
          sourceProjectNodeId: data.sourceProjectNodeId,
          isArchived: data.isArchived,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        update: {
          name: data.name,
          description: data.description,
          titleTemplate: data.titleTemplate,
          bodyTemplate: data.bodyTemplate,
          outcomeTemplate: data.outcomeTemplate,
          status: data.status,
          priority: data.priority,
          riskLevel: data.riskLevel,
          area: data.area,
          tags: data.tags,
          sourceProjectNodeId: data.sourceProjectNodeId,
          isArchived: data.isArchived,
          updatedAt: data.updatedAt,
        },
      });

      const parameterIds = data.parameters.map((param) => param.id);
      await tx.spydrProjectTemplateParameter.deleteMany({
        where: {
          templateId: data.id,
          ...(parameterIds.length > 0 ? { id: { notIn: parameterIds } } : {}),
        },
      });
      for (const param of data.parameters) {
        await tx.spydrProjectTemplateParameter.upsert({
          where: { id: param.id },
          create: param,
          update: {
            key: param.key,
            label: param.label,
            valueType: param.valueType,
            required: param.required,
            defaultValue: param.defaultValue,
            sortOrder: param.sortOrder,
          },
        });
      }

      const taskIds = data.tasks.map((task) => task.id);
      await tx.spydrProjectTemplateTask.deleteMany({
        where: {
          templateId: data.id,
          ...(taskIds.length > 0 ? { id: { notIn: taskIds } } : {}),
        },
      });
      for (const task of data.tasks) {
        await tx.spydrProjectTemplateTask.upsert({
          where: { id: task.id },
          create: task,
          update: {
            titleTemplate: task.titleTemplate,
            bodyTemplate: task.bodyTemplate,
            status: task.status,
            priority: task.priority,
            dueOffsetDays: task.dueOffsetDays,
            estimatedMinutes: task.estimatedMinutes,
            tags: task.tags,
            sortOrder: task.sortOrder,
          },
        });
      }

      return tx.spydrProjectTemplate.findUniqueOrThrow({
        where: { id: data.id },
        include: { parameters: true, tasks: true },
      });
    });

    return this.mapper.toDomain(row as ProjectTemplateRow);
  }
}
