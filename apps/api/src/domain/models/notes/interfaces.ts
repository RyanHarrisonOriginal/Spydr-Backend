import type { IDomainNodeProps } from "../shared.js";

export interface INoteNodeProps extends Omit<IDomainNodeProps<"note">, "nodeType"> {
  details: null;
}
