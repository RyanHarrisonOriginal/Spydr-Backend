import { disconnectPrisma } from "@spydr/db";
import { closeProjectEmbeddingQueue } from "../queues/embedding.queue.js";
import { closeActiveNoteAnalyzeQueue } from "../queues/active-note-analyze.queue.js";
import type { ShutdownResources } from "../types/shutdown.types.js";

export function registerGracefulShutdown(resources: ShutdownResources): void {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[worker] Received ${signal}, shutting down gracefully...`);

    try {
      await Promise.all(
        resources.workers.map(async (worker) => {
          await worker.close();
        })
      );

      await closeProjectEmbeddingQueue();
      await closeActiveNoteAnalyzeQueue();

      if (resources.onShutdown) {
        await resources.onShutdown();
      }

      await disconnectPrisma();

      console.info("[worker] Shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("[worker] Error during shutdown", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
