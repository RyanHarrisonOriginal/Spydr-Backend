import { createHash } from "node:crypto";

export function createRetrievalContentHash(contextText: string): string {
  return createHash("sha256").update(contextText, "utf8").digest("hex");
}
