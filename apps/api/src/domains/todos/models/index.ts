export type TodoItemSource = "user" | "agent";

export const TODO_ITEM_SOURCES: TodoItemSource[] = ["user", "agent"];

export function isTodoItemSource(value: string): value is TodoItemSource {
  return TODO_ITEM_SOURCES.includes(value as TodoItemSource);
}

export interface ITodoItemProps {
  id: string;
  orgId: string;
  userId: string;
  taskNodeId: string;
  source: TodoItemSource;
  sortOrder: number;
  addedAt: Date;
  isStale: boolean;
  staleAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TodoItem implements ITodoItemProps {
  id: string;
  orgId: string;
  userId: string;
  taskNodeId: string;
  source: TodoItemSource;
  sortOrder: number;
  addedAt: Date;
  isStale: boolean;
  staleAt: Date | null;
  removedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ITodoItemProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.taskNodeId = props.taskNodeId;
    this.source = props.source;
    this.sortOrder = props.sortOrder;
    this.addedAt = props.addedAt;
    this.isStale = props.isStale;
    this.staleAt = props.staleAt;
    this.removedAt = props.removedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isActive(): boolean {
    return this.removedAt == null;
  }

  /** Age in whole hours since addedAt (floored, non-negative). */
  ageHours(now = new Date()): number {
    const ms = Math.max(0, now.getTime() - this.addedAt.getTime());
    return Math.floor(ms / (60 * 60 * 1000));
  }

  markStale(now = new Date()): void {
    if (this.removedAt) return;
    if (this.isStale) return;
    this.isStale = true;
    this.staleAt = now;
    this.touch(now);
  }

  remove(now = new Date()): void {
    if (this.removedAt) return;
    this.removedAt = now;
    this.touch(now);
  }

  /** Re-add a previously removed (or refresh an active) membership for today. */
  reactivate(source: TodoItemSource, now = new Date()): void {
    this.source = source;
    this.removedAt = null;
    this.addedAt = now;
    this.isStale = false;
    this.staleAt = null;
    this.touch(now);
  }

  private touch(now = new Date()): void {
    this.updatedAt = now;
  }
}
