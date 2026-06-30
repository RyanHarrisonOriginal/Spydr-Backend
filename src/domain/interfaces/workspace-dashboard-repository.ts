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
  personLoads: IWorkspaceDashboardPersonLoad[];
}

export interface IWorkspaceDashboardRepository {
  getForUser(userId: string): Promise<IWorkspaceDashboard>;
}
