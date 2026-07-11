import type {
  IPersonWork,
  IPersonWorkProjectEntry,
  IPersonWorkTaskEntry,
} from "../../../domain/interfaces/person-work-repository.js";
import {
  ProjectResponseMapper,
  type IProjectResponse,
} from "./project-response.mapper.js";
import { TaskResponseMapper, type ITaskResponse } from "./task-response.mapper.js";

export interface IPersonWorkProjectEntryResponse {
  project: IProjectResponse;
  roles: string[];
  sortOrder: number;
  personSortOrder: number | null;
  globalRank: number;
  personRank: number;
}

export interface IPersonWorkTaskEntryResponse {
  task: ITaskResponse;
  sortOrder: number;
  personSortOrder: number | null;
  globalRank: number;
  personRank: number;
}

export interface IPersonWorkResponse {
  projects: IPersonWorkProjectEntryResponse[];
  tasks: IPersonWorkTaskEntryResponse[];
}

export class PersonWorkResponseMapper {
  constructor(
    private readonly projectMapper = new ProjectResponseMapper(),
    private readonly taskMapper = new TaskResponseMapper()
  ) {}

  toRepresentation(work: IPersonWork): IPersonWorkResponse {
    return {
      projects: work.projects.map((entry) => this.toProjectEntry(entry)),
      tasks: work.tasks.map((entry) => this.toTaskEntry(entry)),
    };
  }

  private toProjectEntry(
    entry: IPersonWorkProjectEntry
  ): IPersonWorkProjectEntryResponse {
    return {
      project: this.projectMapper.toRepresentation(entry.project),
      roles: entry.roles,
      sortOrder: entry.sortOrder,
      personSortOrder: entry.personSortOrder,
      globalRank: entry.globalRank,
      personRank: entry.personRank,
    };
  }

  private toTaskEntry(entry: IPersonWorkTaskEntry): IPersonWorkTaskEntryResponse {
    return {
      task: this.taskMapper.toRepresentation(entry.task, entry.project),
      sortOrder: entry.sortOrder,
      personSortOrder: entry.personSortOrder,
      globalRank: entry.globalRank,
      personRank: entry.personRank,
    };
  }
}
