import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const rows = await prisma.spydrNode.findMany({
    where: { nodeType: "idea" },
    select: { id: true, userId: true, title: true, isDeleted: true },
    take: 20,
  });
  const count = await prisma.spydrNode.count({ where: { nodeType: "idea" } });
  const active = await prisma.spydrNode.count({
    where: { nodeType: "idea", isDeleted: false },
  });
  console.log(JSON.stringify({ count, active, sample: rows }, null, 2));
} finally {
  await prisma.$disconnect();
}
