import type { IDomainNodeProps, ITimestampedDetails } from "../shared.js";

export interface IResourceDetailsProps extends ITimestampedDetails {
  resourceType: string | null;
  url: string | null;
  fileRef: string | null;
  externalSource: string | null;
}

export interface IResourceNodeProps extends Omit<IDomainNodeProps<"resource">, "nodeType"> {
  details: IResourceDetailsProps | null;
}
