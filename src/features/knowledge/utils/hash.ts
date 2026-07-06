// SHA-256 hash of a string using the Web Crypto API (works in browser + workerd).
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeQueryForHash(query: string, filter: Record<string, unknown>): string {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const f = JSON.stringify(filter, Object.keys(filter).sort());
  return `${q}::${f}`;
}
