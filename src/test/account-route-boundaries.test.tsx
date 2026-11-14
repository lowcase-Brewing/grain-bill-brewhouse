import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as PrivateRoute } from "@/routes/_authenticated/route";
import { Route as RootRoute } from "@/routes/__root";

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));
const takeCallback = vi.hoisted(() =>
  vi.fn((): { type: string | null; error: string | null } | null => null),
);
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/lib/backend-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/backend-config")>()),
  accountBackendEnabled: true,
}));
vi.mock("@/lib/auth-callback", () => ({ takePasswordSetupCallback: takeCallback }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("account boundary with the backend enabled (simulated)", () => {
  it.each(["/calculator", "/recipes/other-id", "/workbench", "/settings", "/malts"])(
    "requires an authenticated user for %s",
    async (path) => {
      auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      await expect(
        PrivateRoute.options.beforeLoad!({ location: { href: path } } as never),
      ).rejects.toMatchObject({ options: { to: "/auth", search: { redirect: path } } });
      expect(auth.getUser).toHaveBeenCalledOnce();
    },
  );
  it("binds a valid private route to the authenticated user identity", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: "account-b", email: "b@example.test" } },
      error: null,
    });
    await expect(
      PrivateRoute.options.beforeLoad!({ location: { href: "/workbench" } } as never),
    ).resolves.toEqual({ user: { id: "account-b", email: "b@example.test" } });
  });
  it.each(["/", "/tools/grain-bill", "/tools/malts"])(
    "does not initialize account auth on public route %s even with account configuration available",
    async (path) => {
      auth.getUser.mockResolvedValue({
        data: { user: { id: "existing-private-user" } },
        error: null,
      });
      Object.assign(routeTree.options, {
        shellComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
      });
      const router = createRouter({
        routeTree,
        context: { queryClient: new QueryClient() },
        history: createMemoryHistory({ initialEntries: [path] }),
      });
      await router.load();
      render(<RouterProvider router={router} />);
      expect(await screen.findByRole("navigation", { name: "Public tools" })).toBeVisible();
      expect(auth.getUser).not.toHaveBeenCalled();
      expect(auth.onAuthStateChange).not.toHaveBeenCalled();
      expect(screen.queryByText("existing-private-user")).not.toBeInTheDocument();
    },
  );
  it.each(["invite", "recovery"])(
    "preserves a %s callback arriving at the new public root",
    async (type) => {
      takeCallback.mockReturnValueOnce({ type, error: null });
      expect(() =>
        RootRoute.options.beforeLoad!({
          location: { pathname: "/", hash: "access_token=test-token&type=" + type },
        } as never),
      ).toThrow();
      takeCallback.mockReturnValueOnce({ type, error: "Expired link" });
      try {
        RootRoute.options.beforeLoad!({
          location: { pathname: "/", hash: "access_token=test-token&type=" + type },
        } as never);
      } catch (redirect) {
        expect(redirect).toMatchObject({
          options: {
            to: "/reset-password",
            hash: "access_token=test-token&type=" + type,
            search: { mode: type, error: "Expired link" },
          },
        });
      }
    },
  );
});
