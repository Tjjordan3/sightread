/**
 * After trimming oldest messages, recompute conversation.messageCount.
 * `priorCount` is the count before insert; `removed` is how many were deleted.
 */
export function nextMessageCountAfterSave(
  priorCount: number,
  removed: number,
): number {
  return Math.max(0, priorCount - removed) + 1;
}
