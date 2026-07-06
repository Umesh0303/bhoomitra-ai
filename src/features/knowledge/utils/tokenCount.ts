// Rough token estimator — ~4 chars per token for English/mixed text.
// Good enough for budgeting; swap for tiktoken later if precision matters.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
