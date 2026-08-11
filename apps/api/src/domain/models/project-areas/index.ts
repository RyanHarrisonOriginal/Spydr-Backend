import { DomainNode } from "../shared.js";
import type { IProjectAreaNodeProps } from "./interfaces.js";
import { ProjectAreaDetails } from "./project-area-details.js";

export type { IProjectAreaNodeProps } from "./interfaces.js";
export {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
  type IProjectAreaDetailsProps,
} from "./details.js";
export { ProjectAreaDetails } from "./project-area-details.js";

export class ProjectAreaNode extends DomainNode<"project_area"> {
  readonly details: ProjectAreaDetails | null;

  constructor(props: IProjectAreaNodeProps) {
    super({ ...props, nodeType: "project_area" });
    this.details = props.details ? new ProjectAreaDetails(props.details) : null;
  }

  setColor(color: string): void {
    this.requireDetails().setColor(color);
  }

  private requireDetails(): ProjectAreaDetails {
    if (!this.details) {
      throw new Error("Project area details are required");
    }
    return this.details;
  }
}
