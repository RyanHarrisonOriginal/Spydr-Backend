import {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  PROJECT_EMBEDDING_QUEUE_NAME,
} from "@spydr/shared";
import { registerGracefulShutdown } from "./lib/shutdown.js";
import { startEmbeddingWorker } from "./workers/embedding.worker.js";
import { startActiveNoteAnalyzeWorker } from "./workers/active-note-analyze.worker.js";
import "@spydr/config";

async function main(): Promise<void> {
  const embeddingWorkerId = await startEmbeddingWorker();
  const analyzeWorkerId = await startActiveNoteAnalyzeWorker();

  registerGracefulShutdown({
    workers: [
      { queue: PROJECT_EMBEDDING_QUEUE_NAME, id: embeddingWorkerId },
      { queue: ACTIVE_NOTE_ANALYZE_QUEUE_NAME, id: analyzeWorkerId },
    ],
  });

  console.info(
    `[worker] Spydr AI background worker started (queues=${PROJECT_EMBEDDING_QUEUE_NAME}, ${ACTIVE_NOTE_ANALYZE_QUEUE_NAME})`
  );
}

main().catch((error) => {
  console.error("[worker] Fatal startup error", error);
  process.exit(1);
});
