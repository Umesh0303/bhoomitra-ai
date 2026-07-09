import { createFileRoute } from "@tanstack/react-router";
import { KnowledgePage } from "@/features/knowledge/components/KnowledgePage";

export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({ meta: [{ title: "Farm Knowledge — Bhoomitra AI" }] }),
  component: KnowledgePage,
});
