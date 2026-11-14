// Face-descriptor matching. Descriptors are the 128-dimensional embeddings
// produced by face-api.js's FaceRecognitionNet.

export const FACE_DESCRIPTOR_LENGTH = 128;

export function euclideanDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface FaceMatch {
  /** Smallest euclidean distance to any enrolled descriptor (lower is better). */
  distance: number;
  /** Similarity score in [0, 1], defined as `1 - distance` (clamped). */
  score: number;
}

/**
 * Compare a probe descriptor against a user's enrolled descriptors and return
 * the closest match. Returns `null` when nothing comparable is enrolled.
 */
export function bestFaceMatch(
  probe: readonly number[],
  enrolled: readonly (readonly number[])[] | null | undefined,
): FaceMatch | null {
  const candidates = (enrolled ?? []).filter((d) => d.length === probe.length);
  if (candidates.length === 0) return null;

  const distance = Math.min(...candidates.map((d) => euclideanDistance(probe, d)));
  const score = Math.min(1, Math.max(0, 1 - distance));
  return { distance, score: Math.round(score * 10_000) / 10_000 };
}
