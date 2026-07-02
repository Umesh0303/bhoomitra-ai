import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/ChatWindow";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Bhoomitra AI" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold">AI Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your intelligent farming companion. Ask anything about your crops, soil, or field
          conditions.
        </p>
      </header>
      <ChatWindow />
    </div>
  );
}
