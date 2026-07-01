import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  phone: string | null;
  language: string | null;
  location: string | null;
  subscription_plan: string | null;
  is_new_user: boolean | null;
};

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    // Listener first, then initial fetch (avoids missed events).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus(s ? "authenticated" : "unauthenticated");
      if (s?.user) {
        // Defer profile fetch to avoid deadlock in the listener.
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "authenticated" : "unauthenticated");
      if (data.session?.user) loadProfile(data.session.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
    }),
    [status, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within <AuthProvider>");
  return ctx;
}
