import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/app/AppLayout";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppRouteLayout,
});

function AppRouteLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
