import type { IEmbeddingPort } from "../../../../domain/active-notes/index.js";

const STUB_EMBEDDING = Array.from(
  { length: 1536 },
  (_, index) => (index + 1) / 1536
);

export class StubEmbeddingAdapter implements IEmbeddingPort {
  async embed(): Promise<number[]> {
    return [...STUB_EMBEDDING];
  }
}
