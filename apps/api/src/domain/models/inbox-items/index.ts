import { DomainNode, type SpydrNodeType } from "../shared.js";
import type { IInboxItemDetailsProps, IInboxItemNodeProps } from "./interfaces.js";

export type { IInboxItemDetailsProps, IInboxItemNodeProps } from "./interfaces.js";

export class InboxItemDetails implements IInboxItemDetailsProps {
  readonly rawCapture: string;
  readonly suggestedType: SpydrNodeType | null;
  readonly processedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: IInboxItemDetailsProps) {
    this.rawCapture = props.rawCapture;
    this.suggestedType = props.suggestedType;
    this.processedAt = props.processedAt;
    this.createdAt = props.createdAt;
  }
}

export class InboxItemNode extends DomainNode<"inbox_item"> {
  readonly details: InboxItemDetails | null;

  constructor(props: IInboxItemNodeProps) {
    super({ ...props, nodeType: "inbox_item" });
    this.details = props.details ? new InboxItemDetails(props.details) : null;
  }
}
