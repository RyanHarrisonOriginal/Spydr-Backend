import type {
  SpydrNodeStatus,
  SpydrPriority,
  SpydrProjectTemplate,
  SpydrProjectTemplateParameter,
  SpydrProjectTemplateTask,
} from "@prisma/client";
import {
  ProjectTemplate,
  ProjectTemplateParameter,
  ProjectTemplateTask,
} from "../../../domains/project-templates/models/index.js";

export type ProjectTemplateRow = SpydrProjectTemplate & {
  parameters: SpydrProjectTemplateParameter[];
  tasks: SpydrProjectTemplateTask[];
};

export class PrismaProjectTemplateMapper {
  toDomain(row: ProjectTemplateRow): ProjectTemplate {
    return new ProjectTemplate({
      id: row.id,
      orgId: row.orgId,
      createdByUserId: row.createdByUserId,
      name: row.name,
      description: row.description,
      titleTemplate: row.titleTemplate,
      bodyTemplate: row.bodyTemplate,
      outcomeTemplate: row.outcomeTemplate,
      status: row.status,
      priority: row.priority,
      riskLevel: row.riskLevel,
      area: row.area,
      tags: row.tags,
      sourceProjectNodeId: row.sourceProjectNodeId,
      isArchived: row.isArchived,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parameters: [...row.parameters]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(
          (p) =>
            new ProjectTemplateParameter({
              id: p.id,
              key: p.key,
              label: p.label,
              valueType: "string",
              required: p.required,
              defaultValue: p.defaultValue,
              sortOrder: p.sortOrder,
            })
        ),
      tasks: [...row.tasks]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(
          (t) =>
            new ProjectTemplateTask({
              id: t.id,
              titleTemplate: t.titleTemplate,
              bodyTemplate: t.bodyTemplate,
              status: t.status,
              priority: t.priority,
              dueOffsetDays: t.dueOffsetDays,
              estimatedMinutes: t.estimatedMinutes,
              tags: t.tags,
              sortOrder: t.sortOrder,
            })
        ),
    });
  }

  toPersistence(entity: ProjectTemplate): {
    id: string;
    orgId: string;
    createdByUserId: string;
    name: string;
    description: string | null;
    titleTemplate: string;
    bodyTemplate: string;
    outcomeTemplate: string | null;
    status: SpydrNodeStatus;
    priority: SpydrPriority;
    riskLevel: SpydrPriority;
    area: string | null;
    tags: string[];
    sourceProjectNodeId: string | null;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    parameters: Array<{
      id: string;
      templateId: string;
      key: string;
      label: string;
      valueType: string;
      required: boolean;
      defaultValue: string | null;
      sortOrder: number;
    }>;
    tasks: Array<{
      id: string;
      templateId: string;
      titleTemplate: string;
      bodyTemplate: string;
      status: SpydrNodeStatus;
      priority: SpydrPriority;
      dueOffsetDays: number | null;
      estimatedMinutes: number | null;
      tags: string[];
      sortOrder: number;
    }>;
  } {
    return {
      id: entity.id,
      orgId: entity.orgId,
      createdByUserId: entity.createdByUserId,
      name: entity.name,
      description: entity.description,
      titleTemplate: entity.titleTemplate,
      bodyTemplate: entity.bodyTemplate,
      outcomeTemplate: entity.outcomeTemplate,
      status: entity.status,
      priority: entity.priority,
      riskLevel: entity.riskLevel,
      area: entity.area,
      tags: entity.tags,
      sourceProjectNodeId: entity.sourceProjectNodeId,
      isArchived: entity.isArchived,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      parameters: entity.parameters.map((p) => ({
        id: p.id,
        templateId: entity.id,
        key: p.key,
        label: p.label,
        valueType: p.valueType,
        required: p.required,
        defaultValue: p.defaultValue,
        sortOrder: p.sortOrder,
      })),
      tasks: entity.tasks.map((t) => ({
        id: t.id,
        templateId: entity.id,
        titleTemplate: t.titleTemplate,
        bodyTemplate: t.bodyTemplate,
        status: t.status,
        priority: t.priority,
        dueOffsetDays: t.dueOffsetDays,
        estimatedMinutes: t.estimatedMinutes,
        tags: t.tags,
        sortOrder: t.sortOrder,
      })),
    };
  }
}
