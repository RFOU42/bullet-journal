import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

interface AuthApi {
  session: Session | null;
  /** True only until the first session check resolves — not on every auth call. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const Ctx = createContext<AuthApi | null>(null);

/** French text for the handful of auth error codes a personal app actually hits. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (m.includes("password") && m.includes("at least")) return "Le mot de passe fait 8 caractères minimum.";
  if (m.includes("email not confirmed")) return "Confirme ton adresse e-mail avant de te connecter — regarde tes messages.";
  if (m.includes("rate limit")) return "Trop de tentatives — réessaie dans un instant.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return "La connexion Google n'est pas encore activée sur ce projet.";
  }
  return "Une erreur est survenue — réessaie.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  const api: AuthApi = {
    session,
    loading,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: friendlyError(error.message) } : {};
    },

    signUp: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { error: friendlyError(error.message) };
      // A project with "confirm email" on returns a user but no session yet.
      return { needsConfirmation: !data.session };
    },

    signInWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return error ? { error: friendlyError(error.message) } : {};
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return error ? { error: friendlyError(error.message) } : {};
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
