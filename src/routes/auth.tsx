import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/brew/auth-card";
import { SocialSignIn } from "@/components/brew/social-sign-in";
import { supabase } from "@/integrations/supabase/client";
import { safeAccountPath } from "@/lib/auth-redirect";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · lowcase Brewing" },
      { name: "description", content: "Sign in to your private lowcase Brewing workbench." },
      { property: "og:title", content: "Sign in · lowcase Brewing" },
      { property: "og:description", content: "Private, invite-only brewing workbench." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safePath(target: string | undefined): string {
  return safeAccountPath(target, window.location.origin);
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ href: safePath(redirect), replace: true });
    });
  }, [navigate, redirect]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "That email and password don't match an account." : error.message);
      return;
    }
    await navigate({ href: safePath(redirect), replace: true });
  };

  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  if (mode === "forgot") {
    return (
      <AuthCard title="Reset your password" description="We'll email a reset link if this address has an account.">
        {sent ? (
          <p role="status" className="text-sm">If an account exists for {email.trim()}, a reset link is on its way. Check spam too.</p>
        ) : (
          <form onSubmit={forgot} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
          </form>
        )}
        <Button variant="link" className="mt-3 px-0" onClick={() => { setMode("signin"); setSent(false); setError(null); }}>Back to sign in</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Sign in" description="lowcase Brewing is invite-only. Accounts are added by the owner.">
      <form onSubmit={signIn} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <SocialSignIn destination={() => safePath(redirect)} disabled={busy} onError={setError} onSignedIn={async (path) => { await navigate({ href: path, replace: true }); }} />
      <Button variant="link" className="mt-3 px-0" onClick={() => { setMode("forgot"); setError(null); }}>Forgot password?</Button>
    </AuthCard>
  );
}
