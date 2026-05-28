export type LifecycleState =
  | "planned"
  | "active"
  | "complete"
  | "todo"
  | "doing"
  | "done"
  | null;

export interface INodeSchema {
  type: string;
  label: string;
  allowedParents: (string | null)[];
  allowedChildren: string[];
  lifecycleStates: LifecycleState[];
}

export const builtInTypes = [
  "thought",
  "idea",
  "project",
  "article",
  "article-section",
  "paragraph",
  "question",
] as const;
export type BuiltInNodeType = (typeof builtInTypes)[number];

export const schemas: Record<BuiltInNodeType, INodeSchema> = {
  thought: {
    type: "thought",
    label: "Thought",
    allowedParents: [null, "thought", "idea", "article", "article-section"],
    allowedChildren: ["thought", "idea", "project", "question"],
    lifecycleStates: [],
  },
  idea: {
    type: "idea",
    label: "Idea",
    allowedParents: [null, "thought", "idea", "article"],
    allowedChildren: ["thought", "idea", "project", "question"],
    lifecycleStates: [],
  },
  project: {
    type: "project",
    label: "Project",
    allowedParents: [null, "thought", "idea"],
    allowedChildren: ["thought", "idea", "question"],
    lifecycleStates: ["planned", "active", "complete"],
  },
  article: {
    type: "article",
    label: "Article",
    allowedParents: [null, "thought", "idea", "project"],
    allowedChildren: ["article-section", "paragraph", "thought", "idea"],
    lifecycleStates: ["planned", "active", "complete"],
  },
  "article-section": {
    type: "article-section",
    label: "Section",
    allowedParents: ["article", "article-section"],
    allowedChildren: ["article-section", "paragraph", "thought", "question"],
    lifecycleStates: [],
  },
  paragraph: {
    type: "paragraph",
    label: "Paragraph",
    allowedParents: ["article", "article-section"],
    allowedChildren: [],
    lifecycleStates: [],
  },
  question: {
    type: "question",
    label: "Question",
    allowedParents: [
      null,
      "thought",
      "idea",
      "project",
      "article",
      "article-section",
    ],
    allowedChildren: ["thought", "idea", "paragraph"],
    lifecycleStates: [],
  },
};

export function getSchema(type: string): INodeSchema | undefined {
  return builtInTypes.includes(type as BuiltInNodeType)
    ? schemas[type as BuiltInNodeType]
    : undefined;
}

export function getAllSchemas(): INodeSchema[] {
  return Object.values(schemas);
}
