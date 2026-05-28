import { createBackend } from "./bootstrap.js";

const backend = createBackend();

backend.start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
