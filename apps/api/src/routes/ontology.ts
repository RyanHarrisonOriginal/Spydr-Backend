import { Router } from "express";
import { getAuth } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

export const ontologyRouter = Router();

ontologyRouter.get("/", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const list = await prisma.ontology.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        nodes: { select: { id: true, type: true } },
      },
    });
    const withStats = list.map((o) => {
      const nodeCount = o.nodes.length;
      const typeDistribution: Record<string, number> = {};
      for (const n of o.nodes) {
        typeDistribution[n.type] = (typeDistribution[n.type] ?? 0) + 1;
      }
      const { nodes, ...rest } = o;
      return {
        ...rest,
        nodeCount,
        typeDistribution,
      };
    });
    res.json(withStats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to list ontologies" });
  }
});

ontologyRouter.post("/", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name || typeof name !== "string") {
      res.status(400).json({ message: "name is required" });
      return;
    }
    const created = await prisma.ontology.create({
      data: {
        userId,
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
      },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create ontology" });
  }
});

ontologyRouter.get("/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    const ontology = await prisma.ontology.findUnique({
      where: { id, userId },
      include: { nodes: true },
    });
    if (!ontology) {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    const nodesRecord: Record<string, unknown> = {};
    for (const n of ontology.nodes) {
      const { positionX, positionY, ontologyId, ...rest } = n;
      nodesRecord[n.id] = {
        ...rest,
        fields: n.fields ? (typeof n.fields === "string" ? JSON.parse(n.fields) : n.fields) : {},
        createdAt: n.createdAt.getTime(),
        position: { x: positionX, y: positionY },
      };
    }
    res.json({
      id: ontology.id,
      name: ontology.name,
      description: ontology.description,
      createdAt: ontology.createdAt.getTime(),
      updatedAt: ontology.updatedAt.getTime(),
      nodes: nodesRecord,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to get ontology" });
  }
});

ontologyRouter.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body as { name?: string; description?: string };
    const updated = await prisma.ontology.update({
      where: { id },
      data: {
        ...(typeof name === "string" && { name: name.trim() }),
        ...(typeof description === "string" && { description: description.trim() }),
      },
    });
    res.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ message: "Failed to update ontology" });
  }
});

ontologyRouter.delete("/:id", async (req, res) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    await prisma.ontology.delete({ where: { id, userId } });
    res.status(204).send();
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      res.status(404).json({ message: "Ontology not found" });
      return;
    }
    console.error(e);
    res.status(500).json({ message: "Failed to delete ontology" });
  }
});
