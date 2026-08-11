import { PrismaClient } from "@prisma/client";
import { createBackend } from "../dist/bootstrap.js";
import { IdeasController } from "../dist/infra/http/controllers/ideas.controller.js";

const userId = "user_3B03SaOqcctS2Y64p86GXZ7EGXO";
const backend = createBackend({ prisma: new PrismaClient() });
const controller = new IdeasController(backend.services.queryBus);

const req = { headers: {} };
const res = {
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    console.log("status", this.statusCode);
    console.log(JSON.stringify(data, null, 2));
  },
};

// Mock getAuth by patching - use direct query instead
try {
  const ideas = await backend.services.queryBus.execute(
    new (await import("../dist/domain/cqrs/queries/ideas/list-ideas.query.js")).ListIdeasQuery(userId)
  );
  const mapper = new (await import("../dist/infra/http/mappers/idea-response.mapper.js")).IdeaResponseMapper();
  const json = ideas.map((i) => mapper.toRepresentation(i));
  console.log("mapped count", json.length);
  console.log(JSON.stringify(json[0], null, 2));
} finally {
  await backend.services.prisma.$disconnect();
}
