import { createHash, timingSafeEqual } from 'node:crypto';

/** Compare secrets without leaking the expected value through timing. */
export function secretsMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}
