import { normalizeEmoji } from "../../shared/utils/emoji.js";
import type { IProjectAreaDetailsProps } from "./details.js";
import { normalizeProjectAreaColor } from "./details.js";

export type { IProjectAreaDetailsProps } from "./details.js";
export {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
} from "./details.js";

export class ProjectAreaDetails implements IProjectAreaDetailsProps {
  color: string;
  emoji: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IProjectAreaDetailsProps) {
    this.color = normalizeProjectAreaColor(props.color);
    this.emoji = normalizeEmoji(props.emoji);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setColor(color: string): void {
    this.color = normalizeProjectAreaColor(color);
    this.touch();
  }

  setEmoji(emoji: string | null): void {
    this.emoji = normalizeEmoji(emoji);
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
