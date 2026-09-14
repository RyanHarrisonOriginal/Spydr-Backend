import type { ProjectTemplate } from "../../../domains/project-templates/models/index.js";
import type { IProjectTemplateListItem } from "../../../domains/project-templates/views.js";
import type { IRepresentationMapper } from "../../../domains/shared/mappers/mapper.js";

export interface IProjectTemplateParameterResponse {
  id: string;
  key: string;
  label: string;
  valueType: string;
  required: boolean;
  defaultValue: string | null;
  sortOrder: number;
}

export interface IProjectTemplateTaskResponse {
  id: string;
  titleTemplate: string;
  bodyTemplate: string;
  status: string;
  priority: string;
  dueOffsetDays: number | null;
  estimatedMinutes: number | null;
  tags: string[];
  sortOrder: number;
}

export interface IProjectTemplateListItemResponse {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  area: string | null;
  parameterCount: number;
  taskCount: number;
  updatedAt: string;
}

export interface IProjectTemplateResponse {
  id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  outcomeTemplate: string | null;
  status: string;
  priority: string;
  riskLevel: string;
  area: string | null;
  tags: string[];
  sourceProjectNodeId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  parameters: IProjectTemplateParameterResponse[];
  tasks: IProjectTemplateTaskResponse[];
}

export class ProjectTemplateResponseMapper
  implements IRepresentationMapper<ProjectTemplate, IProjectTemplateResponse>
{
  toListItem(
    item: IProjectTemplateListItem
  ): IProjectTemplateListItemResponse {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      isArchived: item.isArchived,
      area: item.area,
      parameterCount: item.parameterCount,
      taskCount: item.taskCount,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  toRepresentation(domain: ProjectTemplate): IProjectTemplateResponse {
    return {
      id: domain.id,
      organizationId: domain.orgId,
      createdByUserId: domain.createdByUserId,
      name: domain.name,
      description: domain.description,
      titleTemplate: domain.titleTemplate,
      bodyTemplate: domain.bodyTemplate,
      outcomeTemplate: domain.outcomeTemplate,
      status: domain.status,
      priority: domain.priority,
      riskLevel: domain.riskLevel,
      area: domain.area,
      tags: domain.tags,
      sourceProjectNodeId: domain.sourceProjectNodeId,
      isArchived: domain.isArchived,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      parameters: domain.parameters.map((p) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        valueType: p.valueType,
        required: p.required,
        defaultValue: p.defaultValue,
        sortOrder: p.sortOrder,
      })),
      tasks: domain.tasks.map((t) => ({
        id: t.id,
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
