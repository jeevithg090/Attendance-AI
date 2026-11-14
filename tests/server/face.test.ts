import { describe, expect, it } from 'vitest';
import { bestFaceMatch, euclideanDistance, FACE_DESCRIPTOR_LENGTH } from '../../server/lib/face';

const vec = (fill: number) => Array.from({ length: FACE_DESCRIPTOR_LENGTH }, () => fill);

describe('euclideanDistance', () => {
  it('computes the L2 distance', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  it('throws on mismatched lengths', () => {
    expect(() => euclideanDistance([1], [1, 2])).toThrow(/mismatch/);
  });
});

describe('bestFaceMatch', () => {
  it('returns null when nothing is enrolled', () => {
    expect(bestFaceMatch(vec(0), null)).toBeNull();
    expect(bestFaceMatch(vec(0), [])).toBeNull();
  });

  it('ignores enrolled descriptors of the wrong length', () => {
    expect(bestFaceMatch(vec(0), [[1, 2, 3]])).toBeNull();
  });

  it('gives a perfect score for an identical descriptor', () => {
    expect(bestFaceMatch(vec(0.1), [vec(0.1)])).toEqual({ distance: 0, score: 1 });
  });

  it('uses the closest enrolled sample', () => {
    const probe = vec(0);
    const near = vec(0.01); // distance ≈ 0.113
    const far = vec(0.5);
    const match = bestFaceMatch(probe, [far, near]);
    expect(match?.distance).toBeCloseTo(Math.sqrt(FACE_DESCRIPTOR_LENGTH) * 0.01, 6);
    expect(match?.score).toBeCloseTo(1 - Math.sqrt(FACE_DESCRIPTOR_LENGTH) * 0.01, 3);
  });

  it('clamps the score to zero for very different faces', () => {
    expect(bestFaceMatch(vec(0), [vec(1)])?.score).toBe(0);
  });
});
