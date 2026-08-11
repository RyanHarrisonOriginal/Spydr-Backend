import type { IDomainNodeProps, ITimestampedDetails } from "../shared.js";

export interface IPersonDetailsProps extends ITimestampedDetails {
  fullName: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  relationshipContext: string | null;
}

export interface IPersonNodeProps extends Omit<IDomainNodeProps<"person">, "nodeType"> {
  details: IPersonDetailsProps | null;
}
