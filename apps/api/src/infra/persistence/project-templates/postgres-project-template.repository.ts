import type { PrismaClient } from "@prisma/client";
import type { IGetCriteria, ISaveOptions } from "../../../domains/shared/repository.js";
import {
  resolveSaveStrategy,
  type ISaveStrategy,
} from "../../../domains/shared/save-strategy.js";
import type { IProjectTemplateRepository } from "../../../domains/project-templates/repository.js";
import type { ProjectTemplate } from "../../../domains/project-templates/models/index.js";
import {
  PrismaProjectTemplateMapper,
  type ProjectTemplateRow,
} from "./prisma-project-template.mapper.js";
import { StandardProjectTemplateSaveStrategy } from "./save-strategies/standard-project-template-save.strategy.js";

export class PostgresProjectTemplateRepository
  implements IProjectTemplateRepository
{
  private readonly strategies: Map<string, ISaveStrategy<ProjectTemplate, unknown>>;

  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectTemplateMapper(),
    strategies?: ISaveStrategy<ProjectTemplate, unknown>[]
  ) {
    const list =
      strategies ?? [new StandardProjectTemplateSaveStrategy(this.mapper)];
    this.strategies = new Map(list.map((s) => [s.key, s]));
  }

  async get(criteria: IGetCriteria): Promise<ProjectTemplate | null> {
    const row = await this.db.spydrProjectTemplate.findFirst({
      where: {
        id: criteria.id,
        ...(criteria.orgId ? { orgId: criteria.orgId } : {}),
      },
      include: { parameters: true, tasks: true },
    });
    return row ? this.mapper.toDomain(row as ProjectTemplateRow) : null;
  }

  async save(
    entity: ProjectTemplate,
    options?: ISaveOptions
  ): Promise<ProjectTemplate> {
    const strategy = resolveSaveStrategy(
      this.strategies,
      options?.strategy ?? "standard"
    );
    return strategy.save(entity, options?.context, this.db);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrProjectTemplate.delete({ where: { id } });
  }
}
