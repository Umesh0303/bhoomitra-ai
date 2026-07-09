import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Copy, RefreshCw, Send, Sparkles, StopCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownMessage } from "./MarkdownMessage";
import { RagDebugPanel } from "@/features/knowledge/components/RagDebugPanel";
import type { RagDebugData } from "@/features/knowledge/types";

const transport = new DefaultChatTransport({ api: "/api/chat" });

function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/429|rate/i.test(msg)) return "Too many requests. Please wait a moment and try again.";
  if (/402|credit/i.test(msg)) return "AI credits are exhausted. Please contact the workspace owner.";
  if (/401|unauthor|api key|not configured/i.test(msg)) return "AI service is not configured correctly.";
  if (/network|fetch|failed/i.test(msg)) return "Network error. Check your connection and retry.";
  return "Something went wrong. Please try again.";
}

export function ChatWindow() {
  const { messages, sendMessage, regenerate, stop, status, error } = useChat({
    transport,
    onError: (err) => toast.error(friendlyError(err)),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Unable to copy");
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Sparkles className="h-6 w-6" />
            </span>
            <h2 className="font-display text-lg font-semibold">Ask Bhoomitra AI</h2>
            <p className="text-sm text-muted-foreground">
              Get practical, step-by-step guidance on crops, soil, irrigation, pests, diseases,
              organic and sustainable farming, and government schemes.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const text = messageText(m);
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`group max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground"
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <>
                    <MarkdownMessage text={text || "…"} />
                    {m.id === lastAssistantId && !busy && (
                      <div className="mt-2 flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => copy(text)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-background"
                          aria-label="Copy response"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => void regenerate()}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-background"
                          aria-label="Regenerate response"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground shadow-soft">
              <span className="inline-flex items-center gap-2">
                Bhoomitra AI is thinking
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                </span>
              </span>
            </div>
          </div>
        )}

        {error && !busy && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {friendlyError(error)}
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/60 p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about crops, soil, irrigation, pests…"
            rows={1}
            className="max-h-40 min-h-[44px] flex-1 resize-none"
            disabled={busy}
          />
          {busy ? (
            <Button type="button" variant="outline" onClick={() => stop()} aria-label="Stop">
              <StopCircle className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" /> Send
            </Button>
          )}
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
