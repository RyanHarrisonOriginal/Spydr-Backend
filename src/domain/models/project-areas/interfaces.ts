import type { IDomainNodeProps } from "../shared.js";
import type { IProjectAreaDetailsProps } from "./details.js";

export interface IProjectAreaNodeProps
  extends Omit<IDomainNodeProps<"project_area">, "nodeType"> {
  details: IProjectAreaDetailsProps | null;
}
