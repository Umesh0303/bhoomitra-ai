import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { BHOOMITRA_CHAT_MODEL, buildSystemPrompt, type FarmContext } from "@/lib/ai-config";

type ChatRequestBody = {
  messages?: unknown;
  context?: FarmContext; // reserved for future farm/soil/weather/image context
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages, context } = body;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("AI service is not configured", { status: 500 });
        }

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway(BHOOMITRA_CHAT_MODEL);

          const result = streamText({
            model,
            system: buildSystemPrompt(context),
            messages: await convertToModelMessages(messages as UIMessage[]),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            onError: (error) => {
              console.error("[chat] stream error", error);
              if (error instanceof Error) return error.message;
              return "The assistant ran into an unexpected error.";
            },
          });
        } catch (error) {
          console.error("[chat] handler error", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
