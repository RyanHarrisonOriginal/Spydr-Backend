const MAX_EMOJI_LENGTH = 64;

export function normalizeEmoji(value: string | null | undefined): string | null {
  if (value == null) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_EMOJI_LENGTH || /\s/.test(trimmed)) {
    throw new Error("Invalid emoji");
  }

  const graphemes = [
    ...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(trimmed),
  ];
  if (graphemes.length !== 1) {
    throw new Error("Invalid emoji");
  }

  return trimmed;
}
