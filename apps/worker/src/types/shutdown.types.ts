export interface WorkerHandle {
  queue: string;
  id: string;
}

export interface ShutdownResources {
  workers: WorkerHandle[];
  onShutdown?: () => Promise<void>;
}
