import type { ProjectActionContext } from "../types/index.js";

export class ProjectActionContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectActionContextError";
  }
}

export interface IProjectActionContextPort {
  get(projectId: string): Promise<ProjectActionContext>;
}
