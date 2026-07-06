const GATEWAY_EMBEDDINGS_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const BATCH_SIZE = 96; // conservative under 300k tokens/req and 100 items

export type EmbeddingUsage = {
  prompt_tokens: number;
};

export async function embedTexts(
  texts: string[],
  apiKey: string,
): Promise<{ vectors: number[][]; usage: EmbeddingUsage }> {
  if (texts.length === 0) return { vectors: [], usage: { prompt_tokens: 0 } };

  const vectors: number[][] = new Array(texts.length);
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await fetch(GATEWAY_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Embedding call failed [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as {
      data: Array<{ index: number; embedding: number[] }>;
      usage?: { prompt_tokens?: number };
    };
    for (const item of json.data) {
      vectors[i + item.index] = item.embedding;
    }
    totalTokens += json.usage?.prompt_tokens ?? 0;
  }

  return { vectors, usage: { prompt_tokens: totalTokens } };
}

export async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const { vectors } = await embedTexts([text], apiKey);
  return vectors[0];
}
