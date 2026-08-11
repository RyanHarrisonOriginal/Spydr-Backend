import { PrismaClient } from "@prisma/client";
import { createBackend } from "../dist/bootstrap.js";

const userId = "user_3B03SaOqcctS2Y64p86GXZ7EGXO";
const backend = createBackend({ prisma: new PrismaClient() });

try {
  const ideas = await backend.services.repositories.ideas.listByUser(userId);
  console.log("repo count", ideas.length);
  console.log(ideas.map((i) => ({ id: i.id, title: i.title })));

  const { ListIdeasQuery } = await import("../dist/domain/cqrs/queries/ideas/list-ideas.query.js");
  const fromBus = await backend.services.queryBus.execute(
    new ListIdeasQuery(userId)
  );
  console.log("bus count", fromBus.length);
} finally {
  await backend.services.prisma.$disconnect();
}
