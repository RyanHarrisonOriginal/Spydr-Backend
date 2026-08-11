import type { IDomainNodeProps } from "../../../../domain/models/shared.js";

type NodePersistence = {
  isDeleted: boolean;
  deletedAt: Date | null;
};

export function readNodeLifecycle<TType extends IDomainNodeProps["nodeType"]>(
  persistence: NodePersistence
): Pick<IDomainNodeProps<TType>, "isDeleted" | "deletedAt"> {
  return {
    isDeleted: persistence.isDeleted,
    deletedAt: persistence.deletedAt,
  };
}

export function writeNodeLifecycle(domain: {
  isDeleted: boolean;
  deletedAt: Date | null;
}) {
  return {
    isDeleted: domain.isDeleted,
    deletedAt: domain.deletedAt,
  };
}
