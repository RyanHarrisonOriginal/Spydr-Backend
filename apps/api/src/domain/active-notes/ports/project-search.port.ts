import type { ProjectSemanticMatch } from "../types/index.js";

export interface IProjectSearchPort {
  search(
    orgId: string,
    embedding: number[],
    limit?: number
  ): Promise<ProjectSemanticMatch[]>;
}
