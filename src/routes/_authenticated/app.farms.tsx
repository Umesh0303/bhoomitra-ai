import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/farms")({
  component: () => <Outlet />,
});

// Keep the previous link target working: this file becomes a pathless layout,
// and the child index route renders the farm list.
export { Link };
