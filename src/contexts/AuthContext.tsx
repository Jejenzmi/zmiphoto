import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "superadmin" | "admin" | "operator" | "venue" | "partner" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole;
  venueId: string | null;
  venueIds: string[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueIds, setVenueIds] = useState<string[]>([]);

  const checkRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, venue_id")
      .eq("user_id", userId);
    
    if (data && data.length > 0) {
      // Pick highest priority role
      const roleOrder: UserRole[] = ["superadmin", "admin", "operator", "venue", "partner"];
      const sorted = [...data].sort((a, b) => roleOrder.indexOf(a.role as UserRole) - roleOrder.indexOf(b.role as UserRole));
      const primaryRole = sorted[0].role as UserRole;
      setUserRole(primaryRole);
      setIsAdmin(primaryRole === "admin" || primaryRole === "superadmin");
      const ids = data.map(d => (d as any).venue_id).filter(Boolean) as string[];
      const uniqueIds = [...new Set(ids)];
      setVenueIds(uniqueIds);
      setVenueId(uniqueIds[0] || null);
    } else {
      setUserRole(null);
      setIsAdmin(false);
      setVenueIds([]);
      setVenueId(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => checkRole(session.user.id), 0);
        } else {
          setIsAdmin(false);
          setUserRole(null);
          setVenueIds([]);
          setVenueId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, userRole, venueId, venueIds, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
