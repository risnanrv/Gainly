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

  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (fetchedRef.current !== session.user.id) {
          fetchedRef.current = session.user.id;
          fetchUserData(session.user.id, session.user.email);
        }
      } else {
        useStore.getState().clearData();
        if (auth.isAuthenticated) updateAuth({ isAuthenticated: false });
        setInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
         if (fetchedRef.current !== session.user.id) {
           fetchedRef.current = session.user.id;
           fetchUserData(session.user.id, session.user.email);
         }
      } else {
         fetchedRef.current = null;
         useStore.getState().clearData();
         updateAuth({ isAuthenticated: false });
         if (pathname !== "/login") router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string, email?: string) => {
    try {
      // CLEAR all old device data immediately before fetching to ensure isolation constraints
      useStore.getState().clearData();
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
      const logsResp = await supabase.from('logs').select('*').eq('user_id', userId);
      const weightsResp = await supabase.from('weights').select('*').eq('user_id', userId);
      const foodsResp = await supabase.from('foods').select('*').eq('user_id', userId);
      
      let stateUpdates: any = {};
      
      if (profile) {
        updateAuth({ isAuthenticated: true, email: email, name: profile.name, age: profile.age });
        
        // Push actual database values, strictly bypassing any fake logical defaults
        if (profile.target_calories !== undefined) stateUpdates.targetCalories = profile.target_calories;
        if (profile.target_protein !== undefined) stateUpdates.targetProtein = profile.target_protein;
        
        stateUpdates.profile = { 
           startingWeight: profile.starting_weight ?? null, 
           currentWeight: profile.current_weight ?? null, 
           targetWeight: profile.target_weight ?? null, 
           weeks: profile.weeks ?? null 
        };
      } else {
        updateAuth({ isAuthenticated: true, email: email });
        if (pathname !== "/login") router.replace("/login?setup=true");
      }
      
      if (logsResp.data && logsResp.data.length > 0) {
        stateUpdates.logs = {};
        logsResp.data.forEach((log: any) => {
           stateUpdates.logs[log.date] = {
             totalCalories: log.total_calories,
             totalProtein: log.total_protein,
             entries: log.entries
           };
        });
      }
      
      if (weightsResp.data && weightsResp.data.length > 0) {
        stateUpdates.weightLogs = {};
        weightsResp.data.forEach((w: any) => {
           stateUpdates.weightLogs[w.date] = w.weight;
        });
      }
      
      if (foodsResp.data && foodsResp.data.length > 0) {
        stateUpdates.customFoods = foodsResp.data;
      }
      
      if (Object.keys(stateUpdates).length > 0) {
        useStore.setState((state) => ({ ...state, ...stateUpdates }));
      }
      
    } catch (e: any) {
      console.error("Error fetching user data:", e);
      if (e?.code === 'PGRST116') {
        updateAuth({ isAuthenticated: true, email: email });
        if (pathname !== "/login") router.replace("/login?setup=true");
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
            // Sync individual tables according to security rules
            // 1. Profiles
            await supabase.from('profiles').update({
               starting_weight: state.profile.startingWeight,
               current_weight: state.profile.currentWeight,
               target_weight: state.profile.targetWeight,
               weeks: state.profile.weeks,
               target_calories: state.targetCalories,
               target_protein: state.targetProtein
            }).eq('user_id', user.id);
            
            // 2. Logs
            const logsToUpsert = Object.entries(state.logs).map(([date, log]) => ({
               user_id: user.id,
               date,
               total_calories: log.totalCalories,
               total_protein: log.totalProtein,
               entries: log.entries
            }));
            if (logsToUpsert.length > 0) {
               await supabase.from('logs').upsert(logsToUpsert, { onConflict: 'user_id, date' }).eq('user_id', user.id);
            }
            
            // 3. Weights
            const weightsToUpsert = Object.entries(state.weightLogs).map(([date, weight]) => ({
               user_id: user.id,
               date,
               weight
            }));
            if (weightsToUpsert.length > 0) {
               await supabase.from('weights').upsert(weightsToUpsert, { onConflict: 'user_id, date' }).eq('user_id', user.id);
            }

            // 4. Foods
            const foodsToUpsert = state.customFoods.map((food) => ({
               id: food.id && food.id.length > 8 ? food.id : undefined, // If local ID is short hash, omit or let DB gen uuid
               user_id: user.id,
               name: food.name,
               unit: food.unit,
               calories_per_100g: food.calories_per_100g,
               protein_per_100g: food.protein_per_100g,
               calories_per_unit: food.calories_per_unit,
               protein_per_unit: food.protein_per_unit,
               calories_per_100ml: food.calories_per_100ml,
               protein_per_100ml: food.protein_per_100ml
            }));
            if (foodsToUpsert.length > 0) {
               await supabase.from('foods').upsert(foodsToUpsert, { onConflict: 'user_id, name' }).eq('user_id', user.id);
            }
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

  if (!mounted || initializing) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }
  if (!auth.isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
