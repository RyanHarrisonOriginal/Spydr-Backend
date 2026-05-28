import type { IDomainNodeProps, SpydrNodeType } from "../shared.js";

export interface IInboxItemDetailsProps {
  rawCapture: string;
  suggestedType: SpydrNodeType | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface IInboxItemNodeProps extends Omit<IDomainNodeProps<"inbox_item">, "nodeType"> {
  details: IInboxItemDetailsProps | null;
}
