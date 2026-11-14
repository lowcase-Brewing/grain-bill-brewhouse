import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialSignIn } from "@/components/brew/social-sign-in";

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), getUser: vi.fn() }));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser } } }));

describe("Social sign-in session boundary", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(["apple", "google"] as const)("%s returns to public auth and navigates only after user validation", async (provider) => {
    mocks.oauth.mockResolvedValue({ redirected: false });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "invited-user" } }, error: null });
    const onSignedIn = vi.fn();
    render(<SocialSignIn destination={() => "/recipes"} disabled={false} onSignedIn={onSignedIn} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: `Sign in with ${provider === "apple" ? "Apple" : "Google"}` }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith("/recipes"));
    expect(mocks.oauth).toHaveBeenCalledWith(provider, { redirect_uri: `${window.location.origin}/auth?redirect=%2Frecipes` });
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("does not navigate when the provider rejects an account", async () => {
    mocks.oauth.mockResolvedValue({ error: new Error("Signups not allowed") });
    const onSignedIn = vi.fn();
    const onError = vi.fn();
    render(<SocialSignIn destination={() => "/"} disabled={false} onSignedIn={onSignedIn} onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Apple" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Signups not allowed"));
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("does not treat a redirect as a confirmed session", async () => {
    mocks.oauth.mockResolvedValue({ redirected: true });
    const onSignedIn = vi.fn();
    render(<SocialSignIn destination={() => "/"} disabled={false} onSignedIn={onSignedIn} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledOnce());
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(onSignedIn).not.toHaveBeenCalled();
  });
});