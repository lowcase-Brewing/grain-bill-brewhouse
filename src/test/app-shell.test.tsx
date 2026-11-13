import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/brew/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { BrewStoreProvider } from "@/storage/brew-store";

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: function TestRoot() {
    const { queryClient } = rootRoute.useRouteContext();
    return (
      <QueryClientProvider client={queryClient}>
        <BrewStoreProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster position="top-right" />
        </BrewStoreProvider>
      </QueryClientProvider>
    );
  },
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <h1>Dashboard test page</h1>,
});

describe("Root application shell", () => {
  it("renders / with the real providers and opens and closes the Radix mobile menu", async () => {
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Dashboard test page" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Workflow & settings" })).toBeVisible();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Dashboard test page" })).toBeVisible();
  });
});
