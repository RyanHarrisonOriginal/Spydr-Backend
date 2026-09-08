import type { IDomainNodeProps } from "../../shared/models/shared.js";

export interface INoteNodeProps extends Omit<IDomainNodeProps<"note">, "nodeType"> {
  details: null;
}
