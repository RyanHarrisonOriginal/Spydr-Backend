export function nodeLifecycleResponse(domain: {
  isDeleted: boolean;
  deletedAt: Date | null;
}) {
  return {
    isDeleted: domain.isDeleted,
    deletedAt: domain.deletedAt?.toISOString() ?? null,
  };
}
