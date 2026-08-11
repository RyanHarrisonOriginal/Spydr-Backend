import { Router } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

export const nodeRouter = Router({ mergeParams: true });

type FieldSchemaEntry = { key: string; label: string; type: string };

async function getOntologyForUser(ontologyId: string, userId: string) {
  return prisma.ontology.findUnique({
    where: { id: ontologyId, userId },
  });
}

function isNodeTypeAllowed(nodeType: { userId: string | null }, userId: string): boolean {
  return nodeType.userId === null || nodeType.userId === userId;
}

function parseFieldSchema(raw: string): FieldSchemaEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e: unknown) => e && typeof (e as FieldSchemaEntry).key === "string") : [];
  } catch {
    return [];
  }
}

function sanitizeFields(
  fields: Record<string, unknown> | undefined,
  allowedKeys: Set<string>
): Record<string, string> {
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const key of Object.keys(fields)) {
    if (allowedKeys.has(key) && typeof fields[key] === "string") {
      out[key] = fields[key] as string;
    }
  }
  return out;
}

nodeRouter.get("/:ontologyId/nodes", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { ontologyId } = req.params;
    const ontology = await getOntologyForUser(ontologyId, userId);
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const nodes = await prisma.ontologyNode.findMany({
      where: { ontologyId },
      orderBy: { createdAt: "asc" },
    });
    const list = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      parentId: n.parentId,
      fields: n.fields ? (typeof n.fields === "string" ? JSON.parse(n.fields) : n.fields) : {},
      notes: n.notes,
      lifecycleState: n.lifecycleState,
      createdAt: n.createdAt.getTime(),
      position: { x: n.positionX, y: n.positionY },
      isExpanded: n.isExpanded,
    }));
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list nodes" });
  }
});

nodeRouter.post("/:ontologyId/nodes", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { ontologyId } = req.params;
    const ontology = await getOntologyForUser(ontologyId, userId);
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const { type, parentId, title, position, fields: rawFields } = req.body as {
      type?: string;
      parentId?: string | null;
      title?: string;
      position?: { x: number; y: number };
      fields?: Record<string, unknown>;
    };
    if (!type || typeof type !== "string") {
      res.status(400).json({ message: "type is required" });
      return;
    }
    const typeTrimmed = type.trim();
    const nodeType = await prisma.nodeType.findUnique({ where: { id: typeTrimmed } });
    if (!nodeType || !isNodeTypeAllowed(nodeType, userId)) {
      res.status(400).json({ message: "Invalid node type" });
      return;
    }
    const schema = parseFieldSchema(nodeType.fieldSchema);
    const allowedKeys = new Set(schema.map((e) => e.key));
    const fields = sanitizeFields(rawFields, allowedKeys);
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    const created = await prisma.ontologyNode.create({
      data: {
        ontologyId,
        type: typeTrimmed,
        title: typeof title === "string" ? title.trim() : "",
        parentId: parentId ?? null,
        positionX: x,
        positionY: y,
        fields: JSON.stringify(fields),
      },
    });
    res.status(201).json({
      id: created.id,
      type: created.type,
      title: created.title,
      parentId: created.parentId,
      fields: created.fields ? JSON.parse(created.fields) : {},
      notes: created.notes,
      lifecycleState: created.lifecycleState,
      createdAt: created.createdAt.getTime(),
      position: { x: created.positionX, y: created.positionY },
      isExpanded: created.isExpanded,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create node" });
  }
});

nodeRouter.patch("/:ontologyId/nodes/:nodeId", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { ontologyId, nodeId } = req.params;
    const ontology = await getOntologyForUser(ontologyId, userId);
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const existing = await prisma.ontologyNode.findFirst({
      where: { id: nodeId, ontologyId },
    });
    if (!existing) {
      res.status(404).json({ message: "Node not found" });
      return;
    }
    const body = req.body as Partial<{
      title: string;
      notes: string;
      type: string;
      position: { x: number; y: number };
      isExpanded: boolean;
      lifecycleState: string | null;
      fields: Record<string, unknown>;
    }>;
    const update: Record<string, unknown> = {};
    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.notes === "string") update.notes = body.notes;
    if (typeof body.isExpanded === "boolean") update.isExpanded = body.isExpanded;
    if (body.lifecycleState !== undefined) update.lifecycleState = body.lifecycleState;
    if (body.position && typeof body.position.x === "number" && typeof body.position.y === "number") {
      update.positionX = body.position.x;
      update.positionY = body.position.y;
    }
    let effectiveType = existing.type;
    if (typeof body.type === "string") {
      const newType = body.type.trim();
      const nodeType = await prisma.nodeType.findUnique({ where: { id: newType } });
      if (!nodeType || !isNodeTypeAllowed(nodeType, userId)) {
        res.status(400).json({ message: "Invalid node type" });
        return;
      }
      update.type = newType;
      effectiveType = newType;
      const lifecycleArr = nodeType.lifecycleStates ? JSON.parse(nodeType.lifecycleStates) : [];
      update.lifecycleState = Array.isArray(lifecycleArr) && lifecycleArr.length > 0 ? lifecycleArr[0] : null;
    }
    if (body.fields !== undefined) {
      const nodeType = await prisma.nodeType.findUnique({ where: { id: effectiveType } });
      const schema = nodeType ? parseFieldSchema(nodeType.fieldSchema) : [];
      const allowedKeys = new Set(schema.map((e) => e.key));
      const sanitized = sanitizeFields(body.fields, allowedKeys);
      update.fields = JSON.stringify(sanitized);
    }
    const updated = await prisma.ontologyNode.update({
      where: { id: nodeId },
      data: update,
    });
    res.json({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      parentId: updated.parentId,
      fields: updated.fields ? JSON.parse(updated.fields) : {},
      notes: updated.notes,
      lifecycleState: updated.lifecycleState,
      createdAt: updated.createdAt.getTime(),
      position: { x: updated.positionX, y: updated.positionY },
      isExpanded: updated.isExpanded,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      res.status(404).json({ message: "Node not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ message: "Failed to update node" });
  }
});

nodeRouter.delete("/:ontologyId/nodes/:nodeId", async (req, res) => {
  try {
    const { ontologyId, nodeId } = req.params;
    const existing = await prisma.ontologyNode.findFirst({
      where: { id: nodeId, ontologyId },
    });
    if (!existing) {
      res.status(404).json({ message: "Node not found" });
      return;
    }
    await prisma.ontologyNode.delete({ where: { id: nodeId } });
    res.status(204).send();
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete node" });
  }
});

nodeRouter.post("/:ontologyId/nodes/:nodeId/move", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { ontologyId, nodeId } = req.params;
    const ontology = await getOntologyForUser(ontologyId, userId);
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const existing = await prisma.ontologyNode.findFirst({
      where: { id: nodeId, ontologyId },
    });
    if (!existing) {
      res.status(404).json({ message: "Node not found" });
      return;
    }
    const { newParentId } = req.body as { newParentId?: string | null };
    const updated = await prisma.ontologyNode.update({
      where: { id: nodeId },
      data: { parentId: newParentId ?? null },
    });
    res.json({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      parentId: updated.parentId,
      fields: updated.fields ? JSON.parse(updated.fields) : {},
      notes: updated.notes,
      lifecycleState: updated.lifecycleState,
      createdAt: updated.createdAt.getTime(),
      position: { x: updated.positionX, y: updated.positionY },
      isExpanded: updated.isExpanded,
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      res.status(404).json({ message: "Node not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ message: "Failed to move node" });
  }
});

nodeRouter.post("/:ontologyId/nodes/merge", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { ontologyId } = req.params;
    const ontology = await getOntologyForUser(ontologyId, userId);
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const { sourceId, targetId } = req.body as { sourceId?: string; targetId?: string };
    if (!sourceId || !targetId) {
      res.status(400).json({ message: "sourceId and targetId are required" });
      return;
    }
    const [source, target] = await Promise.all([
      prisma.ontologyNode.findFirst({ where: { id: sourceId, ontologyId } }),
      prisma.ontologyNode.findFirst({ where: { id: targetId, ontologyId } }),
    ]);
    if (!source || !target) {
      res.status(404).json({ message: "Source or target node not found" });
      return;
    }
    const mergedNotes = [source.notes, target.notes].filter(Boolean).join("\n\n");
    await prisma.$transaction([
      prisma.ontologyNode.updateMany({
        where: { parentId: sourceId, ontologyId },
        data: { parentId: targetId },
      }),
      prisma.ontologyNode.update({
        where: { id: targetId },
        data: { notes: mergedNotes },
      }),
      prisma.ontologyNode.delete({ where: { id: sourceId } }),
    ]);
    const updated = await prisma.ontologyNode.findUnique({
      where: { id: targetId },
    });
    if (!updated) {
      res.status(500).json({ message: "Merge failed" });
      return;
    }
    res.json({
      id: updated.id,
      type: updated.type,
      title: updated.title,
      parentId: updated.parentId,
      fields: updated.fields ? JSON.parse(updated.fields) : {},
      notes: updated.notes,
      lifecycleState: updated.lifecycleState,
      createdAt: updated.createdAt.getTime(),
      position: { x: updated.positionX, y: updated.positionY },
      isExpanded: updated.isExpanded,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to merge nodes" });
  }
});
