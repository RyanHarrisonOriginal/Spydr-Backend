import type { Worker } from "bullmq";

export interface ShutdownResources {
  workers: Worker[];
  onShutdown?: () => Promise<void>;
}
