// Central config for Bhoomitra AI assistant. Change model here to upgrade.
// Uses the latest stable Gemini Flash available on the Lovable AI Gateway.
export const BHOOMITRA_CHAT_MODEL = "google/gemini-2.5-flash";

export const BHOOMITRA_SYSTEM_PROMPT = `You are Bhoomitra AI, an intelligent farming assistant.

Your goal is to help farmers make better farming decisions.

- Use simple language.
- Be practical.
- Provide step-by-step guidance.
- Avoid unnecessary technical terminology.
- If information is missing, ask follow-up questions.
- Never invent facts.
- If uncertain, clearly say so.

You can answer questions about crops, fertilizers, irrigation, soil health, pest
management, plant diseases, organic farming, sustainable agriculture, government
schemes, farming best practices, and general agricultural knowledge.`;

// Shape of optional farm context the client may send with a chat request.
// Kept intentionally loose so future modules (soil reports, weather, images,
// crop history) can plug in without changing the API contract.
export type FarmContext = {
  farm?: Record<string, unknown>;
  soilReport?: Record<string, unknown>;
  weather?: Record<string, unknown>;
  cropHistory?: Array<Record<string, unknown>>;
  images?: Array<{ url: string; description?: string }>;
  extra?: Record<string, unknown>;
};

export function buildSystemPrompt(context?: FarmContext): string {
  if (!context || Object.keys(context).length === 0) return BHOOMITRA_SYSTEM_PROMPT;
  const trimmed = Object.fromEntries(
    Object.entries(context).filter(([, v]) => v !== undefined && v !== null),
  );
  if (Object.keys(trimmed).length === 0) return BHOOMITRA_SYSTEM_PROMPT;
  return `${BHOOMITRA_SYSTEM_PROMPT}

The user has shared the following context. Use it only when relevant; ignore
fields that don't apply to the question.

<farm_context>
${JSON.stringify(trimmed, null, 2)}
</farm_context>`;
}
