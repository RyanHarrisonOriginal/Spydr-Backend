# Spydr API architecture

This document is the source of truth for backend structure. Agents and humans must follow it when adding or changing API code.

## Goals

- Domains are self-contained: each carries **commands**, **queries**, **models**, and **mappers**.
- No DDD aggregate ceremony and no centralized CQRS package tree.
- Write repositories are strict: **`get` / `save` / `delete` only**.
- Specialized persistence uses the **strategy pattern** on `save`, only when needed.
- **Domain behavior lives on domain models** as methods — not in command handlers, mappers, or repositories.
- Command handlers orchestrate repositories, mapping, domain methods, and commits.
- Query handlers serve views and projections through dedicated view ports.

## Package layout

| Path | Role |
|------|------|
| `apps/api/src/domains/<name>/` | Domain slice (commands, queries, models, mappers, repository + views ports) |
| `apps/api/src/domains/shared/application/` | Command/query buses and handler registration |
| `apps/api/src/domains/shared/models/` | Shared node base types and enums |
| `apps/api/src/infra/persistence/<name>/` | Postgres repos, view readers, save strategies, Prisma mappers |
| `apps/api/src/infra/http/` | Controllers, routers, response mappers |

## Repository contract

```ts
interface IGetCriteria {
  id: string;
  orgId?: string;
  includeDeleted?: boolean;
}

interface ISaveOptions<TContext = unknown> {
  strategy?: string; // default: "standard"
  context?: TContext;
}

interface IRepository<TEntity> {
  get(criteria: IGetCriteria): Promise<TEntity | null>;
  save(entity: TEntity, options?: ISaveOptions): Promise<TEntity>;
  delete(id: string): Promise<void>;
}
```

### What must not appear on write repositories

- List / search methods
- `updateForOrg`, `assignToProject`, `saveForProject`, `restore*`, `setAreaAssignment`, etc.
- Business orchestration (validation chains, multi-entity workflows)

Those belong in **commands** (orchestration + `save` strategies) or **views** (reads).

## Save strategies

Implement `ISaveStrategy<TEntity, TContext>` in `infra/persistence/<domain>/save-strategies/`.

| When | Action |
|------|--------|
| Upsert entity + details is enough | Use `"standard"` (default) |
| Persist must also create links, skip children, batch reorder, etc. | Add a named strategy and pass it from the command |

Command handlers decide the strategy. Repositories never expose strategy-specific public methods.

## Domain models (behavior encapsulation)

Every domain aggregate owns its behavior as **methods on the domain object**.

| Belongs on the model | Does not belong on the model |
|----------------------|------------------------------|
| Status transitions (`complete`, `restore`) | Loading / saving via repositories |
| Field updates (`applyUpdate`, setters) | Cross-aggregate existence checks via `get` |
| Soft-delete / restore flags | HTTP / DTO shaping |
| Child collection ops (`addTask`, `softDeleteChild`) | Input string → typed value parsing (dates, enums) when done in mappers |
| Invariants that only need the aggregate’s state | Multi-repo orchestration |

Prefer mutating the loaded entity in place (setters / `applyUpdate` / `complete` / `softDelete`), then `save` or `delete`.

Mappers construct new aggregates from create input (`toModel`). They must **not** encode update/complete/delete rules — those are domain methods.

## Commands vs queries

**Command handler** — orchestration only:

1. `get` entities needed for the write (and related repos for validation)
2. Map create input → domain model when creating (`mapper.toModel`), or use the loaded entity
3. Execute **domain methods** on the aggregate (`complete()`, `applyUpdate(...)`, `softDelete()`, `addTask(...)`, …)
4. `save` / `delete` via repository (with strategy if required)

Handlers must not inline field patches, status transitions, or soft-delete flag logic. Call a method on the domain object instead.

**Query handler**

1. Call domain `views` port (`list`, `getDetail`, dashboard projections, …)
2. Map to response shape (view/response mapper)
3. Never writes

## Views (read ports)

Each domain that needs projections defines `views.ts`:

```ts
interface ITaskViews {
  listByOrg(orgId: string): Promise<ITaskListItem[]>;
  getListItem(orgId: string, taskId: string): Promise<ITaskListItem | null>;
}
```

Views are **not** repositories. Wire them next to Postgres repos in composition root.

## Mappers

| Mapper | Direction |
|--------|-----------|
| Domain mapper | Create/API input → domain model (`toModel` only) |
| Prisma mapper | DB row ↔ domain model |
| Response / view mapper | Domain or projection ↔ HTTP JSON |

Keep transforms out of handlers and repositories except for calling mappers. Update/complete/delete rules belong on domain methods, not domain mappers.

## Adding a feature (checklist)

1. Place files under `domains/<domain>/`.
2. Put new write behavior on the domain model as a method first.
3. Write command and/or query + handler that orchestrates get → map → domain method → save/delete.
4. Extend domain mapper only for create/input construction — not for update/complete logic.
5. Use existing `get`/`save`/`delete`; add a save strategy only if persistence shape differs.
6. Add or extend `views` for new read shapes — do not add list methods to the write repo.
7. Register handler in shared application registration.
8. Expose HTTP in `infra/http` using buses; map responses with response mappers.

## Exceptions

- `@spydr/active-notes` session persistence may keep pipeline-specific methods (begin/complete/fail) — treat as a session store, not a domain write repo.
- Auth/org membership checks used by HTTP middleware live on organization **views**.
- During migration, some domains still expose list helpers on Postgres classes that are only consumed through `LegacyListViews` adapters. Do not call those helpers from command handlers; new list reads belong on view ports. Extract remaining list SQL into dedicated `*-views.ts` files when touching a domain.
