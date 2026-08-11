import type { IProjectAreaDetailsProps } from "./details.js";
import { normalizeProjectAreaColor } from "./details.js";

export type { IProjectAreaDetailsProps } from "./details.js";
export {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
} from "./details.js";

export class ProjectAreaDetails implements IProjectAreaDetailsProps {
  color: string;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IProjectAreaDetailsProps) {
    this.color = normalizeProjectAreaColor(props.color);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setColor(color: string): void {
    this.color = normalizeProjectAreaColor(color);
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
