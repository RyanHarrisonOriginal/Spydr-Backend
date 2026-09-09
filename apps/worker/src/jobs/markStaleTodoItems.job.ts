import { prisma } from "@spydr/db";
import { TODO_STALE_AFTER_MS } from "@spydr/shared";

export async function handleMarkStaleTodoItems(): Promise<{ marked: number }> {
  const cutoff = new Date(Date.now() - TODO_STALE_AFTER_MS);
  const now = new Date();

  const result = await prisma.spydrTodoItem.updateMany({
    where: {
      removedAt: null,
      isStale: false,
      addedAt: { lt: cutoff },
    },
    data: {
      isStale: true,
      staleAt: now,
      updatedAt: now,
    },
  });

  console.info(
    `[job] mark-stale-todo-items completed (marked=${result.count}, cutoff=${cutoff.toISOString()})`
  );

  return { marked: result.count };
}
