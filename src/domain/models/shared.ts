export const spydrNodeTypes = [
  "project",
  "task",
  "idea",
  "note",
  "decision",
  "resource",
  "inbox_item",
  "person",
] as const;

export const spydrNodeStatuses = [
  "active",
  "inactive",
  "completed",
  "archived",
  "blocked",
  "waiting",
  "snoozed",
] as const;

export const spydrPriorities = ["low", "medium", "high", "critical"] as const;

export const spydrRelationshipTypes = [
  "belongs_to",
  "depends_on",
  "blocks",
  "references",
  "spawned",
  "supports",
  "related_to",
  "decided_by",
  "owner",
  "member",
  "admin",
  "creator",
  "editor",
  "viewer",
  "commenter",
  "liker",
  "sharer",
  "unsharer",
  "follower",
  "unfollower",
  "subscriber",
  "unsubscriber",
  "subscriber",
] as const;

export type SpydrNodeType = (typeof spydrNodeTypes)[number];
export type SpydrNodeStatus = (typeof spydrNodeStatuses)[number];
export type SpydrPriority = (typeof spydrPriorities)[number];
export type SpydrRelationshipType = (typeof spydrRelationshipTypes)[number];

export interface IDomainNodeProps<TType extends SpydrNodeType = SpydrNodeType> {
  id: string;
  userId: string;
  nodeType: TType;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  area: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class DomainNode<TType extends SpydrNodeType = SpydrNodeType>
  implements IDomainNodeProps<TType>
{
  readonly id: string;
  readonly userId: string;
  readonly nodeType: TType;
  readonly title: string;
  readonly body: string;
  readonly status: SpydrNodeStatus;
  readonly priority: SpydrPriority;
  readonly area: string | null;
  readonly tags: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly archivedAt: Date | null;
  readonly relationships: {
    type: SpydrRelationshipType;
    targetNode: string;
    reason: string | null;
  }[];

  constructor(props: IDomainNodeProps<TType>) {
    this.id = props.id;
    this.userId = props.userId;
    this.nodeType = props.nodeType;
    this.title = props.title;
    this.body = props.body;
    this.status = props.status;
    this.priority = props.priority;
    this.area = props.area;
    this.tags = [...props.tags];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.archivedAt = props.archivedAt;
    this.relationships = [];
  }

  addRelationship(relationshipType: SpydrRelationshipType, targetNode: DomainNode, reason: string | null = null): void {
    this.relationships.push({
      type: relationshipType,
      targetNode: targetNode.id,
      reason: reason,
    });
  }

}

export interface ITimestampedDetails {
  createdAt: Date;
  updatedAt: Date;
}
