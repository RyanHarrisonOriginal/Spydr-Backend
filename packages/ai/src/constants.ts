export const PROJECT_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";

/** Default output dimensions for `text-embedding-3-small`. */
export const PROJECT_EMBEDDING_VECTOR_DIMENSIONS = 1536;
