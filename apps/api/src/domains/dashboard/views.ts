export interface IWorkspaceDashboardPersonRef {
  id: string;
  name: string;
}

export interface IWorkspaceDashboardPersonRoleCounts {
  assignee: number;
  requester: number;
  sponsor: number;
  reviewer: number;
}

export interface IWorkspaceDashboardPersonLoad {
  person: IWorkspaceDashboardPersonRef | null;
  projects: number;
  openProjects: number;
  tasks: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  roleCounts: IWorkspaceDashboardPersonRoleCounts;
}

export type IWorkspaceDashboardStatusCounts = Record<string, number>;

export interface IWorkspaceDashboardAreaSummary {
  id: string | null;
  name: string;
  /** HSL channels, e.g. `18 94% 50%` */
  color: string;
  projects: number;
  activeProjects: number;
  tasks: number;
  openTasks: number;
}

export interface IWorkspaceDashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  unassignedProjects: number;
  unassignedProjectTasks: number;
  unlinkedTasks: number;
}

export interface IWorkspaceDashboard {
  generatedAt: string;
  summary: IWorkspaceDashboardSummary;
  projectStatusCounts: IWorkspaceDashboardStatusCounts;
  taskStatusCounts: IWorkspaceDashboardStatusCounts;
  areaSummaries: IWorkspaceDashboardAreaSummary[];
  personLoads: IWorkspaceDashboardPersonLoad[];
}

export interface IWorkspaceDashboardRepository {
  getForOrg(orgId: string): Promise<IWorkspaceDashboard>;
}
