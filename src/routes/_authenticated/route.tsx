import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/brew/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { takePasswordSetupCallback } from "@/lib/auth-callback";
import { CloudBrewRepository } from "@/storage/cloud-repository";
import { BrewStoreProvider } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const callback = takePasswordSetupCallback();
    if (callback) {
      throw redirect({ to: "/reset-password", search: { mode: callback.type === "invite" ? "invite" : "recovery", error: callback.error ?? undefined } });
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: { id: data.user.id, email: data.user.email ?? "" } };
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground" role="status">
      Checking your sign-in…
    </div>
  ),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  };
  return (
    // Keyed by user: switching accounts remounts the store, discarding all
    // previous in-memory data and ignoring that account's late responses.
    <BrewStoreProvider key={user.id} createRepository={() => new CloudBrewRepository(supabase, user.id)}>
      <AppShell account={{ email: user.email, onSignOut: signOut }}>
        <Outlet />
      </AppShell>
    </BrewStoreProvider>
  );
}
