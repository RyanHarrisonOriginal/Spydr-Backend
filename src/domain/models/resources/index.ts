import { DomainNode } from "../shared.js";
import type { IResourceDetailsProps, IResourceNodeProps } from "./interfaces.js";

export type { IResourceDetailsProps, IResourceNodeProps } from "./interfaces.js";

export class ResourceDetails implements IResourceDetailsProps {
  readonly resourceType: string | null;
  readonly url: string | null;
  readonly fileRef: string | null;
  readonly externalSource: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: IResourceDetailsProps) {
    this.resourceType = props.resourceType;
    this.url = props.url;
    this.fileRef = props.fileRef;
    this.externalSource = props.externalSource;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export class ResourceNode extends DomainNode<"resource"> {
  readonly details: ResourceDetails | null;

  constructor(props: IResourceNodeProps) {
    super({ ...props, nodeType: "resource" });
    this.details = props.details ? new ResourceDetails(props.details) : null;
  }
}
