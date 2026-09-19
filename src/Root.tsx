import { useState } from "react";
import { App } from "./App";
import { AuthLogin } from "./screens/AuthLogin";
import { AuthSignup } from "./screens/AuthSignup";
import { useAuth } from "./state/AuthContext";
import { JournalProvider } from "./state/JournalContext";

/**
 * The account gate. An account is required — the journal now lives in
 * Supabase, not the browser — so nothing below this renders until someone is
 * signed in.
 */
export function Root() {
  const { session, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");

  if (loading) {
    return (
      <div className="splash">
        <div className="auth-mark">◗</div>
      </div>
    );
  }

  if (!session) {
    return authScreen === "login" ? (
      <AuthLogin onSwitchToSignup={() => setAuthScreen("signup")} />
    ) : (
      <AuthSignup onSwitchToLogin={() => setAuthScreen("login")} />
    );
  }

  return (
    <JournalProvider userId={session.user.id}>
      <App />
    </JournalProvider>
  );
}
