# Spydr Ontology - Backend

Express + TypeScript API for **ontologies**, **nodes**, and **custom node types**, persisted in **PostgreSQL** with **Prisma**. All routes under `/api` require a valid **Clerk** session (`@clerk/express`).

## Stack

| Piece | Role |
| --- | --- |
| Express | HTTP server, JSON body, CORS |
| Prisma | ORM, migrations, PostgreSQL |
| Clerk | Session verification for every `/api` request |

## Project layout

```
src/
├── index.ts                 # App setup, middleware, routes, PORT
├── lib/prisma.ts            # Prisma client
├── middleware/auth.ts       # requireAuthApi -> 401 if unauthenticated
├── config/node-schemas.ts   # Built-in node type metadata (labels, allowed trees)
└── routes/
    ├── ontology.ts            # Ontology CRUD
    ├── nodes.ts               # Nodes CRUD, move, merge (scoped by ontologyId)
    └── node-types.ts          # Node type CRUD (presets + user-defined)

prisma/
└── schema.prisma            # Ontology, NodeType, OntologyNode models
```

## Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted: Neon, Supabase, etc.)
- Clerk application (publishable + secret keys; publishable key should match the frontend `VITE_CLERK_PUBLISHABLE_KEY`)

## Getting started

```bash
cd C:\Users\Ryanh\Documents\apps\spydah-ontology-backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
npm run db:generate
npm run db:migrate
# or: npm run db:push
npm run dev
```

Default listen URL: `http://localhost:3001` (override with `PORT`).

The frontend should use `VITE_API_URL=http://localhost:3001/api` unless you change `PORT`.

## Environment variables

Copy `.env.example` to `.env`. Do not commit `.env`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `CLERK_PUBLISHABLE_KEY` | Yes | Same publishable key as the frontend. |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key for token verification. |
| `OPENAI_API_KEY` | For Active Notes analyze | Server-side OpenAI key used by `POST /api/active-notes/analyze`. |
| `OPENAI_ACTIVE_NOTE_MODEL` | No | Model override (default `gpt-4o-mini`). |
| `PORT` | No | HTTP port (default **3001**). |

### Active Notes (increment 1)

`POST /api/active-notes/analyze` accepts free-form text and returns structured Spydr object proposals. It does **not** persist proposals or create Spydr objects. Requires auth + `X-Org-Id`, and `OPENAI_API_KEY`.

```bash
npm test
npm run dev
```

## HTTP API

Base path: `/api`. Every route below is protected by `requireAuthApi` (401 without a Clerk user).

### Ontologies

Mounted at `/api/ontologies`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List current user's ontologies (with node stats). |
| POST | `/` | Create ontology (`name`, optional `description`). |
| GET | `/:id` | Get ontology with all nodes. |
| PATCH | `/:id` | Update name/description. |
| DELETE | `/:id` | Delete ontology (cascades nodes). |

### Nodes

Mounted at `/api/ontologies` (same prefix as ontologies; paths include `ontologyId`).

| Method | Path | Description |
| --- | --- | --- |
| GET | `/:ontologyId/nodes` | List nodes. |
| POST | `/:ontologyId/nodes` | Create node. |
| PATCH | `/:ontologyId/nodes/:nodeId` | Update node. |
| DELETE | `/:ontologyId/nodes/:nodeId` | Delete node. |
| POST | `/:ontologyId/nodes/:nodeId/move` | Move / reparent node. |
| POST | `/:ontologyId/nodes/merge` | Merge `sourceId` into `targetId` (reparent children, merge notes, delete source). |

### Node types

Mounted at `/api/node-types`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | List preset and user-defined node types. |
| POST | `/` | Create custom node type. |
| PATCH | `/:id` | Update custom node type. |
| DELETE | `/:id` | Delete custom node type. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run `node dist/index.js` (after build) |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` (schema sync without migration files) |
| `npm run db:studio` | Prisma Studio |

## Data model (short)

- **Ontology** - owned by `userId` (Clerk user id), has many nodes.
- **OntologyNode** - tree via `parentId`, canvas `positionX` / `positionY`, JSON `fields`, `notes`, `type` referencing **NodeType** id.
- **NodeType** - presets (`userId` null) and user-defined types; stores JSON strings for allowed parents/children, lifecycle, field schema.

See `prisma/schema.prisma` for full definitions.
