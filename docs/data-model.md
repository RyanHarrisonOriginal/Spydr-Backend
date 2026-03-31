# Data model (ontology)

This document describes the Prisma entities and relationships for the ontology use case, and key invariants.

## Entities

### Ontology

- **id** (String, cuid or uuid) — PK.
- **name** (String).
- **description** (String, optional).
- **createdAt** (DateTime).
- **updatedAt** (DateTime).

### OntologyNode

- **id** (String, cuid or uuid) — PK.
- **ontologyId** (String) — FK → Ontology.id.
- **type** (String) — built-in type name or custom type id.
- **title** (String).
- **parentId** (String?, nullable) — self-FK → OntologyNode.id; null means root.
- **fields** (Json) — flexible key-value (e.g. Record<string, string>).
- **notes** (String or @db.Text).
- **lifecycleState** (String?, nullable).
- **createdAt** (DateTime).
- **positionX** (Float), **positionY** (Float) — canvas position.
- **isExpanded** (Boolean, default true).

**Indexes:** (ontologyId, parentId) for efficient tree queries; ontologyId for listing nodes of an ontology.

### CustomNodeType

- **id** (String, cuid or uuid) — PK.
- **ontologyId** (String) — FK → Ontology.id.
- **label** (String).
- **color** (String).
- **allowedParents** (Json) — array of type strings or "custom".
- **allowedChildren** (Json) — array of type strings or "custom".
- **lifecycleStates** (Json) — array of strings.

## Relationships

- Ontology 1 → N OntologyNode (by ontologyId).
- Ontology 1 → N CustomNodeType (by ontologyId).
- OntologyNode parent/children: parentId self-reference; children = nodes where parentId = this node’s id.

## Invariants

- **Parent-child rules:** When creating or moving a node, validate that (parent type, node type) is allowed by the corresponding NodeSchema or CustomNodeType. Root nodes have parentId null; allowedParents must include null for that type.
- **Lifecycle:** lifecycleState, when set, must be one of the lifecycleStates for that node type (built-in or custom).
- **Tree scope:** parentId must reference a node in the same ontology (and exist). No cycles (enforce in service layer when moving).
- **Cascade:** On ontology delete, delete all its nodes and custom types. On node delete, decide: cascade delete children or reassign to parent (product decision; cascade is simpler).

## Built-in NodeSchemas

Not stored in DB. Served from a config module (same shapes as moc-up: thought, idea, project, article, article-section, paragraph, question) with label, allowedParents, allowedChildren, lifecycleStates. Used for validation and for GET /node-schemas.
