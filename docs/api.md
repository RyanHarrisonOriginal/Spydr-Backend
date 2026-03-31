# API spec (ontology)

REST API; JSON request/response bodies. Base path TBD (e.g. `/api`).

## Ontologies

- **GET /ontologies** — List all ontologies. Response `200`: array of `{ id, name, description, createdAt, updatedAt }`.
- **POST /ontologies** — Body: `{ name: string, description?: string }`. Response `201`: created ontology (id, name, description, createdAt, updatedAt).
- **GET /ontologies/:id** — Get one ontology with nodes and customNodeTypes. Response `200`: `{ id, name, description, createdAt, updatedAt, nodes: array | record, customNodeTypes: array | record }`. Or separate GETs for nodes/custom-types.
- **PATCH /ontologies/:id** — Body: `{ name?: string, description?: string }`. Response `200`: updated ontology.
- **DELETE /ontologies/:id** — Response `204` or `200`. Cascade: delete all nodes and custom types for this ontology.

## Nodes

- **GET /ontologies/:ontologyId/nodes** — List nodes (flat or tree). Response `200`: array of nodes. Node shape: `{ id, ontologyId, type, title, parentId, fields, notes, lifecycleState, createdAt, positionX, positionY, isExpanded }` (or `position: { x, y }` if preferred).
- **POST /ontologies/:ontologyId/nodes** — Body: `{ type, parentId?: string | null, title?: string, position?: { x, y } }`. Validate type and parent. Response `201`: created node.
- **PATCH /ontologies/:ontologyId/nodes/:nodeId** — Body: partial node (title, notes, positionX/positionY or position, isExpanded, lifecycleState, etc.). Response `200`: updated node.
- **DELETE /ontologies/:ontologyId/nodes/:nodeId** — Response `204` or `200`. Cascade delete children or reassign (see data-model).
- **POST /ontologies/:ontologyId/nodes/:nodeId/move** — Body: `{ newParentId: string | null }`. Validate allowedParents/allowedChildren. Response `200`: updated node(s).
- **POST /ontologies/:ontologyId/nodes/merge** — Body: `{ sourceId, targetId }`. Merge source into target (e.g. merge notes, reassign children, delete source). Response `200`: result (e.g. updated target node).

## Custom node types

- **GET /ontologies/:ontologyId/custom-types** — Response `200`: array or record of custom types. Shape: `{ id, ontologyId, label, color, allowedParents, allowedChildren, lifecycleStates }`.
- **POST /ontologies/:ontologyId/custom-types** — Body: `{ label, color, allowedParents, allowedChildren, lifecycleStates }`. Response `201`: created type (with id).
- **PATCH /ontologies/:ontologyId/custom-types/:id** — Body: partial. Response `200`: updated type.
- **DELETE /ontologies/:ontologyId/custom-types/:id** — Response `204` or `200`.

## Node schemas (built-in)

- **GET /node-schemas** — Read-only. Response `200`: array of `{ type, label, allowedParents, allowedChildren, lifecycleStates }` for built-in types.

## Errors

- **4xx / 5xx:** JSON body with `message` or `error` (and optional `code`). Example: `{ "message": "Invalid parent for this node type", "code": "VALIDATION_ERROR" }`.
