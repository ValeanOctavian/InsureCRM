"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

/**
 * Provides the authenticated user to the entire app.
 *
 * Uses a single Supabase client instance (via the singleton in client.ts)
 * to prevent "Multiple GoTrueClient instances" warnings. Does NOT call
 * router.refresh() inside onAuthStateChange — that would create an infinite
 * re-render loop when server components re-fetch and the client re-initializes.
 *
 * Instead, the AuthProvider listens for auth state changes and updates local state,
 * which triggers client-side re-renders naturally. Server components can call
 * getCurrentUser() or getCurrentProfile() independently on navigation.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Store the client in a ref so it never changes across renders.
  // createClient() now returns a singleton anyway, but useRef ensures
  // the value is stable even if the singleton were to change.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Intentionally NOT calling router.refresh() here.
      // Doing so would cause an infinite loop: refresh triggers re-render,
      // which re-runs this effect, which attaches a new onAuthStateChange
      // listener, which calls refresh again, etc.
      // Server components re-fetch data naturally on page navigation.
    });

    return () => subscription.unsubscribe();
  }, [supabase, refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
