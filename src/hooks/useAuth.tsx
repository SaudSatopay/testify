import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/constants";
import { logAudit } from "@/services/auditService";
import type { Profile } from "@/types";

interface AuthResult {
  error?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  /** True while the initial session + profile are being resolved. */
  loading: boolean;
  isSuspended: boolean;
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    role: "candidate" | "interviewer";
  }) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function roleHome(role: Role | null): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "interviewer":
      return "/interviewer/dashboard";
    case "candidate":
      return "/candidate/dashboard";
    default:
      return "/login";
  }
}

function asRole(value: string | null | undefined): Role | null {
  return value === "candidate" || value === "interviewer" || value === "admin" ? value : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      console.warn("profile load failed:", error.message);
      return null;
    }
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Subscribe first so no auth event is missed, then resolve the current session.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const nextUserId = nextSession?.user?.id ?? null;
      if (nextUserId !== userIdRef.current) {
        userIdRef.current = nextUserId;
        if (!nextUserId) {
          setProfile(null);
        } else {
          // Defer the profile fetch out of the auth callback (supabase-js guidance).
          setTimeout(() => {
            void loadProfile(nextUserId).then((p) => {
              if (!cancelled && userIdRef.current === nextUserId) setProfile(p);
            });
          }, 0);
        }
      }
    });

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        const userId = data.session?.user?.id ?? null;
        userIdRef.current = userId;
        if (userId) {
          const p = await loadProfile(userId);
          if (!cancelled) setProfile(p);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ fullName, email, password, role }) => {
    // Only candidate/interviewer are accepted client-side; the database
    // trigger enforces the same rule server-side (admin is never granted here).
    const safeRole = role === "interviewer" ? "interviewer" : "candidate";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: safeRole },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) logAudit("user_login", "auth", data.user.id);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    logAudit("user_logout", "auth", userIdRef.current ?? undefined);
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userIdRef.current) return;
    const p = await loadProfile(userIdRef.current);
    setProfile(p);
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: asRole(profile?.role),
      loading,
      isSuspended: profile?.status === "suspended",
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, resetPassword, updatePassword, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
