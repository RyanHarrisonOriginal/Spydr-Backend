import "@spydr/config";

import { PROJECT_EMBEDDING_QUEUE_NAME } from "@spydr/shared";
import { registerGracefulShutdown } from "./lib/shutdown.js";
import { createEmbeddingWorker } from "./workers/embedding.worker.js";

async function main(): Promise<void> {
  const worker = createEmbeddingWorker();

  registerGracefulShutdown({ workers: [worker] });

  console.info(
    `[worker] Spydr AI background worker started (queue=${PROJECT_EMBEDDING_QUEUE_NAME})`
  );
}

main().catch((error) => {
  console.error("[worker] Fatal startup error", error);
  process.exit(1);
});
