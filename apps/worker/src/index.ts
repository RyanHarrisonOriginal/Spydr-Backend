import "@spydr/config";

import {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  PROJECT_EMBEDDING_QUEUE_NAME,
} from "@spydr/shared";
import { registerGracefulShutdown } from "./lib/shutdown.js";
import { createEmbeddingWorker } from "./workers/embedding.worker.js";
import { createActiveNoteAnalyzeWorker } from "./workers/active-note-analyze.worker.js";

async function main(): Promise<void> {
  const embeddingWorker = createEmbeddingWorker();
  const analyzeWorker = createActiveNoteAnalyzeWorker();

  registerGracefulShutdown({ workers: [embeddingWorker, analyzeWorker] });

  console.info(
    `[worker] Spydr AI background worker started (queues=${PROJECT_EMBEDDING_QUEUE_NAME}, ${ACTIVE_NOTE_ANALYZE_QUEUE_NAME})`
  );
}

main().catch((error) => {
  console.error("[worker] Fatal startup error", error);
  process.exit(1);
});
