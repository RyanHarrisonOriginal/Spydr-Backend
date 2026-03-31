# Ontology use case (Spydr)

This document describes the product purpose, user flows, main entities, and server responsibilities for the ontology (Spydr) feature.

## Product purpose

**Spydr — Structured Thinking Engine:** A note-taking and organization app where users define **hierarchical ontologies** and create **nodes** that follow type rules (parent/child, lifecycle). Users organize thoughts, ideas, and projects in a tree/graph and can attach rich notes to nodes.

## Main entities

- **Ontology:** A named container (id, name, description, createdAt, updatedAt) that holds nodes and custom node types.
- **OntologyNode:** A node in the tree (id, type, title, parentId, fields, notes, lifecycleState, position, isExpanded, etc.). Tree relationship is via `parentId`.
- **NodeSchema (built-in):** Fixed types (e.g. thought, idea, project, article, article-section, paragraph, question) with label, allowedParents, allowedChildren, lifecycleStates. Served from code/config; not stored in DB.
- **CustomNodeType:** User-defined types per ontology (id, label, color, allowedParents, allowedChildren, lifecycleStates). Stored per ontology.

## User flows (server-relevant)

1. **Dashboard:** Client lists ontologies (GET), creates/updates/deletes ontologies (POST/PATCH/DELETE).
2. **Canvas:** Client loads one ontology with nodes and custom types (GET), creates/updates/deletes/moves/merges nodes (POST/PATCH/DELETE, move/merge endpoints), and manages custom types (CRUD under ontology).

## Server responsibilities

- **Persistence:** Store Ontology, OntologyNode, CustomNodeType in the database (Prisma). Return consistent shapes (ids, timestamps, nested or referenced data as per API spec).
- **Validation:** Enforce parent-child rules (allowedParents, allowedChildren) and lifecycle states per node type (built-in and custom). Reject invalid move/merge and invalid node type usage.
- **Tree integrity:** Ensure parentId references a node in the same ontology; on delete, handle children (e.g. cascade or reassign). Merge: combine source into target and remove source (and update children to point to target).
