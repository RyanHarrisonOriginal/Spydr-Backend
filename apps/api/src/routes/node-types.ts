import { Router } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

export const nodeTypesRouter = Router();

function parseJsonField<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function toNodeTypeResponse(row: {
  id: string;
  label: string;
  color: string;
  allowedParents: string;
  allowedChildren: string;
  lifecycleStates: string;
  fieldSchema: string;
  isPreset: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    allowedParents: parseJsonField<(string | null)[]>(row.allowedParents, []),
    allowedChildren: parseJsonField<string[]>(row.allowedChildren, []),
    lifecycleStates: parseJsonField<(string | null)[]>(row.lifecycleStates, []),
    fieldSchema: parseJsonField<{ key: string; label: string; type: string; icon?: string }[]>(row.fieldSchema, []),
    isPreset: row.isPreset,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function isValidFieldSchema(
  arr: unknown
): arr is { key: string; label: string; type: string; icon?: string }[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { key?: unknown }).key === "string" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { type?: unknown }).type === "string" &&
      ((item as { icon?: unknown }).icon === undefined ||
        typeof (item as { icon?: unknown }).icon === "string")
  );
}

nodeTypesRouter.get("/", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const list = await prisma.nodeType.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ isPreset: "desc" }, { label: "asc" }],
    });
    res.json(list.map(toNodeTypeResponse));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list node types" });
  }
});

nodeTypesRouter.post("/", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id, label, color, allowedParents, allowedChildren, lifecycleStates, fieldSchema } =
      req.body as {
        id?: string;
        label?: string;
        color?: string;
        allowedParents?: unknown[];
        allowedChildren?: unknown[];
        lifecycleStates?: unknown[];
        fieldSchema?: unknown;
      };
    if (!label || typeof label !== "string") {
      res.status(400).json({ message: "label is required" });
      return;
    }
    const typeId =
      typeof id === "string" && id.trim()
        ? id.trim()
        : `ct_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const allowedParentsArr = Array.isArray(allowedParents) ? allowedParents : [];
    const allowedChildrenArr = Array.isArray(allowedChildren) ? allowedChildren : [];
    const lifecycleStatesArr = Array.isArray(lifecycleStates) ? lifecycleStates : [];
    const schema = isValidFieldSchema(fieldSchema) ? fieldSchema : [];
    const created = await prisma.nodeType.create({
      data: {
        id: typeId,
        userId,
        label: label.trim(),
        color: typeof color === "string" ? color : "#6b7280",
        allowedParents: JSON.stringify(allowedParentsArr),
        allowedChildren: JSON.stringify(allowedChildrenArr),
        lifecycleStates: JSON.stringify(lifecycleStatesArr),
        fieldSchema: JSON.stringify(schema),
        isPreset: false,
      },
    });
    res.status(201).json(toNodeTypeResponse(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create node type" });
  }
});

nodeTypesRouter.patch("/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.nodeType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Node type not found" });
      return;
    }
    if (existing.isPreset || existing.userId !== userId) {
      res.status(404).json({ message: "Node type not found" });
      return;
    }
    const body = req.body as Partial<{
      label: string;
      color: string;
      allowedParents: unknown[];
      allowedChildren: unknown[];
      lifecycleStates: unknown[];
      fieldSchema: unknown;
    }>;
    const update: Record<string, unknown> = {};
    if (typeof body.label === "string") update.label = body.label.trim();
    if (typeof body.color === "string") update.color = body.color;
    if (Array.isArray(body.allowedParents)) update.allowedParents = JSON.stringify(body.allowedParents);
    if (Array.isArray(body.allowedChildren)) update.allowedChildren = JSON.stringify(body.allowedChildren);
    if (Array.isArray(body.lifecycleStates)) update.lifecycleStates = JSON.stringify(body.lifecycleStates);
    if (isValidFieldSchema(body.fieldSchema)) update.fieldSchema = JSON.stringify(body.fieldSchema);
    const updated = await prisma.nodeType.update({
      where: { id, userId },
      data: update,
    });
    res.json(toNodeTypeResponse(updated));
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      res.status(404).json({ message: "Node type not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ message: "Failed to update node type" });
  }
});

nodeTypesRouter.delete("/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    const existing = await prisma.nodeType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Node type not found" });
      return;
    }
    if (existing.isPreset || existing.userId !== userId) {
      res.status(404).json({ message: "Node type not found" });
      return;
    }
    const inUse = await prisma.ontologyNode.count({ where: { type: id } });
    if (inUse > 0) {
      res.status(400).json({ message: "Node type is in use and cannot be deleted" });
      return;
    }
    await prisma.nodeType.delete({ where: { id, userId } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete node type" });
  }
});
