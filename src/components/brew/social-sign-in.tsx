import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import appleLogo from "@/assets/apple-sign-in-white.svg";

export function SocialSignIn({ destination, disabled, onSignedIn, onError }: {
  destination: () => string;
  disabled: boolean;
  onSignedIn: (path: string) => void | Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const signIn = async (provider: "apple" | "google") => {
    setBusy(true);
    onError(null);
    try {
      const path = destination();
      const callback = new URL("/auth", window.location.origin);
      callback.searchParams.set("redirect", path);
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: callback.href });
      if (result.error) {
        onError(result.error.message);
        return;
      }
      if (result.redirected) return;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        onError("Sign-in wasn't completed. Please try again with your invited account.");
        return;
      }
      await onSignedIn(path);
    } catch {
      onError("Sign-in couldn't be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 space-y-3" aria-busy={busy}>
      <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void signIn("apple")}
        className="h-11 w-full gap-1 border-apple-button bg-apple-button py-0 pr-7 font-[system-ui] text-[18.92px] text-apple-button-foreground hover:bg-apple-button hover:text-apple-button-foreground">
        <img src={appleLogo} alt="" className="h-11 w-[31px] shrink-0" />Sign in with Apple
      </Button>
      <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void signIn("google")}
        className="h-11 w-full gap-2.5 border-google-button-border bg-google-button px-3 text-sm font-medium leading-5 text-google-button-foreground hover:bg-google-button hover:text-google-button-foreground">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-[18px]!">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
          <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
        </svg>Sign in with Google
      </Button>
    </div>
  );
}