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

      await tx.spydrProjectTemplateParameter.deleteMany({
        where: { templateId: data.id },
      });
      await tx.spydrProjectTemplateTask.deleteMany({
        where: { templateId: data.id },
      });

      if (data.parameters.length > 0) {
        await tx.spydrProjectTemplateParameter.createMany({
          data: data.parameters,
        });
      }
      if (data.tasks.length > 0) {
        await tx.spydrProjectTemplateTask.createMany({
          data: data.tasks,
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
