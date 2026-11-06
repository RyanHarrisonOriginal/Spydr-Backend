import type { IdeaNode } from "./models/index.js";

export interface IIdeaProjectRef {
  id: string;
  title: string;
}

export interface IIdeaListItem {
  idea: IdeaNode;
  project: IIdeaProjectRef | null;
}

export interface IIdeaViews {
  listByOrg(orgId: string): Promise<IIdeaListItem[]>;
}
