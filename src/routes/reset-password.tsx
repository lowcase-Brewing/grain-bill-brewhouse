import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/brew/auth-card";
import { supabase } from "@/integrations/supabase/client";
import { takePasswordSetupCallback } from "@/lib/auth-callback";

const search = z.object({ mode: z.enum(["invite", "recovery"]).optional(), error: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  validateSearch: search,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password · lowcase Brewing" },
      { name: "description", content: "Choose a password for your lowcase Brewing account." },
      { property: "og:title", content: "Set your password · lowcase Brewing" },
      { property: "og:description", content: "Finish an invitation or password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const [callback] = useState(() => takePasswordSetupCallback());
  const mode = s.mode ?? (callback?.type === "invite" ? "invite" : "recovery");
  const linkError = s.error ?? callback?.error ?? null;
  const [phase, setPhase] = useState<"checking" | "ready" | "missing">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (linkError) return;
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !done) { done = true; setPhase("ready"); }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) { done = true; setPhase("ready"); }
    });
    const t = setTimeout(() => { if (!done) setPhase("missing"); }, 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [linkError]);

  const title = mode === "invite" ? "Accept your invitation" : "Choose a new password";

  if (linkError || phase === "missing") {
    return (
      <AuthCard title="This link can't be used" description={linkError ? decodeURIComponent(linkError.replace(/\+/g, " ")) : "The link is missing, expired, or was already used."}>
        <p className="text-sm text-muted-foreground">{mode === "invite" ? "Ask the owner to send a fresh invitation." : "Request a new reset link from the sign-in page."}</p>
        <Button asChild className="mt-4 w-full"><Link to="/auth">Go to sign in</Link></Button>
      </AuthCard>
    );
  }
  if (phase === "checking") {
    return <AuthCard title={title}><p role="status" className="text-sm text-muted-foreground">Checking your link…</p></AuthCard>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    await navigate({ to: "/", replace: true });
  };

  return (
    <AuthCard title={title} description="Pick a password you'll use to sign in.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw2">Confirm password</Label><Input id="pw2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </AuthCard>
  );
}
