"use client";

import { useStore } from "@/store/useStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { auth, updateAuth, updateProfile } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserData(session.user.id, session.user.email);
      } else {
        if (auth.isAuthenticated) updateAuth({ isAuthenticated: false });
        setInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
         fetchUserData(session.user.id, session.user.email);
      } else {
         updateAuth({ isAuthenticated: false });
         if (pathname !== "/login") router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string, email?: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (profile) {
        updateAuth({ isAuthenticated: true, email: email, name: profile.name, age: profile.age });
        if (profile.app_state) {
          // Sync state from cloud if it exists
          useStore.setState((state) => ({ ...state, ...profile.app_state }));
        }
      } else {
        updateAuth({ isAuthenticated: true, email: email });
        // Enforce signup flow if missing profile
        if (pathname !== "/login") {
           router.replace("/login?setup=true");
        }
      }
    } catch (e: any) {
      console.error("Error fetching user data:", e);
      // Suppress 406 row not found when new user hits it
      if (e?.code === 'PGRST116') {
        updateAuth({ isAuthenticated: true, email: email });
        if (pathname !== "/login") {
           router.replace("/login?setup=true");
        }
      }
    } finally {
      setInitializing(false);
    }
  };

  // Setup generic sync for user data payload
  useEffect(() => {
    if (!mounted || initializing || !auth.isAuthenticated) return;
    
    // Subscribe to store changes to sync with Supabase
    const unsub = useStore.subscribe((state, prevState) => {
      // Avoid syncing auth object or unmounted
      if (!state.auth.isAuthenticated) return;
      
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      syncTimeoutRef.current = setTimeout(async () => {
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
            // Pick objects from state we want to sync
            const stateToSync = {
               logs: state.logs,
               weightLogs: state.weightLogs,
               expenses: state.expenses,
               expenseCategories: state.expenseCategories,
               customFoods: state.customFoods,
               profile: state.profile,
               reminders: state.reminders,
               targetCalories: state.targetCalories,
               targetProtein: state.targetProtein,
            };
            await supabase.from('profiles').update({ app_state: stateToSync }).eq('id', user.id);
         }
      }, 2000); // Debounce for 2 seconds
    });
    
    return () => unsub();
  }, [mounted, initializing, auth.isAuthenticated]);

  useEffect(() => {
    if (!mounted || initializing) return;
    
    if (!auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    } else if (auth.isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [mounted, initializing, auth.isAuthenticated, pathname, router]);

  if (!mounted || initializing) return null; 
  if (!auth.isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
