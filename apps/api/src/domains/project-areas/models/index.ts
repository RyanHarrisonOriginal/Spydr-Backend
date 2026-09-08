import { DomainNode } from "../../shared/models/shared.js";
import type { IProjectAreaNodeProps } from "./interfaces.js";
import { ProjectAreaDetails } from "./project-area-details.js";
import {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
} from "./details.js";

export type { IProjectAreaNodeProps } from "./interfaces.js";
export {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
  type IProjectAreaDetailsProps,
} from "./details.js";
export { ProjectAreaDetails } from "./project-area-details.js";

export class ProjectAreaNode extends DomainNode<"project_area"> {
  details: ProjectAreaDetails | null;

  constructor(props: IProjectAreaNodeProps) {
    super({ ...props, nodeType: "project_area" });
    this.details = props.details ? new ProjectAreaDetails(props.details) : null;
  }

  ensureDetails(now = new Date()): ProjectAreaDetails {
    if (!this.details) {
      this.details = new ProjectAreaDetails({
        color: DEFAULT_PROJECT_AREA_COLOR,
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.details;
  }

  setColor(color: string): void {
    this.ensureDetails().setColor(color);
    this.touch();
  }

  applyColorUpdate(color: string): void {
    this.setColor(normalizeProjectAreaColor(color));
  }
}
