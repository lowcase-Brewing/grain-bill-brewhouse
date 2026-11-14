import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as PrivateRoute } from "@/routes/_authenticated/route";
import { GuestCalculator } from "@/components/public/guest-calculator";

// Any accidental account-client use in a public route is a hard failure.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error("Public tools accessed the account backend");
      },
    },
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openRoute(path: string) {
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
  return router;
}

describe("public tools without account or storage access", () => {
  it.each([
    ["/", "Let’s brew something good."],
    ["/tools/grain-bill", "Grain bill calculator"],
    ["/tools/malts", "Standard malt reference"],
  ])("opens %s directly without a sign-in or storage dependency", async (path, heading) => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("No storage access allowed");
      },
    });
    const fetch = vi.fn(() => Promise.reject(new Error("Network disabled")));
    vi.stubGlobal("fetch", fetch);
    try {
      const router = await openRoute(path!);
      expect(await screen.findByRole("heading", { name: heading!, level: 1 })).toBeVisible();
      expect(router.state.location.pathname).toBe(path);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });

  it("calculates, edits, and clears without reading or changing any browser draft", async () => {
    const read = vi.spyOn(window.localStorage, "getItem");
    const write = vi.spyOn(window.localStorage, "setItem");
    const remove = vi.spyOn(window.localStorage, "removeItem");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<GuestCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Load reference example" }));
    const results = screen.getByRole("region", { name: "Results" });
    expect(within(results).getByText("1.060")).toBeVisible();
    expect(within(results).getByText("+8.3 pts")).toBeVisible();
    expect(within(results).getByText("13 lb")).toBeVisible();
    expect(within(results).getByText("9 lb")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Pounds, row 1"), { target: { value: "-2" } });
    expect(within(results).queryByText("1.060")).not.toBeInTheDocument();
    expect(screen.getByText("Pounds can't be negative.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear calculation" }),
    );
    expect(screen.queryByLabelText("Pounds, row 1")).not.toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not restore guest work after the calculator is remounted", () => {
    const first = render(<GuestCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Load reference example" }));
    expect(screen.getByLabelText("Pounds, row 1")).toHaveValue("6");
    first.unmount();
    render(<GuestCalculator />);
    expect(screen.queryByLabelText("Pounds, row 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download calculation" })).toBeDisabled();
  });

  it("creates a text download locally with no network or account operation", () => {
    const blob = vi.fn(() => "blob:local-calculation");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: blob });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<GuestCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Load reference example" }));
    fireEvent.click(screen.getByRole("button", { name: "Download calculation" }));
    expect(blob).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(blob.mock.calls[0]?.length).toBe(1);
  });

  it("searches only the standard library and does not offer editing to guests", async () => {
    await openRoute("/tools/malts");
    expect(await screen.findByText("23 of 23 ingredients")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Search the reference"), {
      target: { value: "Vienna" },
    });
    expect(screen.getByText("1 of 23 ingredients")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vienna Malt" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Add ingredient|Edit|Delete/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Extract" } });
    expect(screen.getByText("No matching ingredients.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByText("23 of 23 ingredients")).toBeVisible();
  });

  it.each([
    "/workbench",
    "/calculator",
    "/malts",
    "/recipes",
    "/settings",
    "/recipes/other-user-record",
  ])("keeps %s out of the disconnected guest preview", async (path) => {
    await expect(
      PrivateRoute.options.beforeLoad!({ location: { href: path } } as never),
    ).rejects.toMatchObject({ options: { to: "/auth", search: { redirect: path } } });
  });
});
