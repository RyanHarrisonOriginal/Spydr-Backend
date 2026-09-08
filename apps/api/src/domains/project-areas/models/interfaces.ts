import type { IDomainNodeProps } from "../../shared/models/shared.js";
import type { IProjectAreaDetailsProps } from "./details.js";

export interface IProjectAreaNodeProps
  extends Omit<IDomainNodeProps<"project_area">, "nodeType"> {
  details: IProjectAreaDetailsProps | null;
}
