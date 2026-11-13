import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { formatLinkError } from "@/lib/link-error";

const MISSING_LINK_TEXT = "The link is missing, expired, or was already used.";

async function renderResetPassword(search: string) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [`/reset-password${search}`] }),
  });
  await router.load();
  const result = render(<RouterProvider router={router} />);
  // eslint-disable-next-line no-console
  console.log("HTML:", result.container.innerHTML.slice(0, 600), "| body:", document.body.innerHTML.slice(0, 600));
  return result;
}

describe("Reset password link errors", () => {
  it("formats already-decoded link text without throwing", () => {
    expect(() => formatLinkError("%", MISSING_LINK_TEXT)).not.toThrow();
    expect(formatLinkError("%", MISSING_LINK_TEXT)).toBe("%");
    expect(formatLinkError("Link is expired or already used", MISSING_LINK_TEXT)).toBe(
      "Link is expired or already used",
    );
    expect(formatLinkError("   ", MISSING_LINK_TEXT)).toBe(MISSING_LINK_TEXT);
    expect(formatLinkError(null, MISSING_LINK_TEXT)).toBe(MISSING_LINK_TEXT);
  });

  it("renders the error card for a link error whose text is a literal percent sign", async () => {
    renderResetPassword("?mode=invite&error=%25");

    expect(await screen.findByText("This link can't be used")).toBeTruthy();
    expect(screen.getByText("%")).toBeTruthy();
    expect(screen.getByText("Ask the owner to send a fresh invitation.")).toBeTruthy();
    expect(screen.queryByText("Checking your link…")).toBeNull();
  });

  it("renders the error card for a normal expired recovery link message", async () => {
    renderResetPassword("?mode=recovery&error=Link%20is%20expired%20or%20already%20used");

    expect(await screen.findByText("This link can't be used")).toBeTruthy();
    expect(
      screen.getByText("Link is expired or already used"),
    ).toBeTruthy();
    expect(
      screen.getByText("Request a new reset link from the sign-in page."),
    ).toBeTruthy();
    expect(screen.queryByText("Checking your link…")).toBeNull();
  });
});
