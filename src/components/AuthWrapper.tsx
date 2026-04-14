"use client";

import { useStore } from "@/store/useStore";
import type { UserProfile, DailySummary, ExpenseCategory, ExpenseEntry, FoodEntry, FoodEntryDB } from "@/store/useStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

const DEBUG_HYDRATE = process.env.NODE_ENV === "development";

function normalizeLogEntries(raw: unknown): FoodEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e: Record<string, unknown>) => ({
    id: typeof e.id === "string" && e.id ? e.id : crypto.randomUUID(),
    name: String(e.name ?? ""),
    calories: Number(e.calories ?? 0),
    protein: Number(e.protein ?? 0),
    timestamp: typeof e.timestamp === "number" ? e.timestamp : Date.now(),
  }));
}

function mapFoodRow(row: Record<string, unknown>): FoodEntryDB {
  const created = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
  return {
    id: String(row.id),
    name: String(row.name),
    unit: (row.unit === "count" || row.unit === "ml" || row.unit === "grams" ? row.unit : "grams") as FoodEntryDB["unit"],
    calories_per_100g: row.calories_per_100g != null ? Number(row.calories_per_100g) : undefined,
    protein_per_100g: row.protein_per_100g != null ? Number(row.protein_per_100g) : undefined,
    calories_per_unit: row.calories_per_unit != null ? Number(row.calories_per_unit) : undefined,
    protein_per_unit: row.protein_per_unit != null ? Number(row.protein_per_unit) : undefined,
    calories_per_100ml: row.calories_per_100ml != null ? Number(row.calories_per_100ml) : undefined,
    protein_per_100ml: row.protein_per_100ml != null ? Number(row.protein_per_100ml) : undefined,
    timestamp: created,
  };
}

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const auth = useStore((s) => s.auth);
  const isDataLoaded = useStore((s) => s.isDataLoaded);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSessionUserId = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void handleSession(session.user.id, session.user.email ?? undefined);
      } else {
        lastSessionUserId.current = null;
        useStore.getState().clearData();
        if (useStore.getState().auth.isAuthenticated) {
          useStore.setState((s) => ({ ...s, auth: { ...s.auth, isAuthenticated: false } }));
        }
        setInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void handleSession(session.user.id, session.user.email ?? undefined);
      } else {
        lastSessionUserId.current = null;
        useStore.getState().clearData();
        useStore.setState((s) => ({ ...s, auth: { ...s.auth, isAuthenticated: false } }));
        if (pathname !== "/login") router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSession = async (userId: string, email?: string) => {
    const switched = lastSessionUserId.current !== null && lastSessionUserId.current !== userId;
    lastSessionUserId.current = userId;
    if (switched) {
      useStore.getState().clearData();
    }
    useStore.setState({ isDataLoaded: false });
    await fetchUserData(userId, email);
  };

  const fetchUserData = async (userId: string, email?: string) => {
    useStore.setState({ isDataLoaded: false });

    type Patch = Partial<{
      auth: { isAuthenticated: boolean; email?: string; name?: string; age?: number };
      profile: UserProfile | null;
      targetCalories: number | null;
      targetProtein: number | null;
      logs: Record<string, DailySummary>;
      weightLogs: Record<string, number>;
      customFoods: FoodEntryDB[];
      expenses: Record<string, ExpenseEntry[]>;
      expenseCategories: ExpenseCategory[];
      hiddenDefaultFoodNames: string[];
      reminders: { dailySummary: boolean };
    }>;

    const patch: Patch = {};

    try {
      let profile = null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        if (error.code === "PGRST116") {
          // No profile found → create one
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              starting_weight: null,
              current_weight: null,
              target_calories: null,
              target_protein: null,
            })
            .select()
            .single();
      
          if (insertError) {
            console.error("Profile create error:", insertError.message);
          } else {
            profile = newProfile;
          }
        } else {
          console.error("Profile fetch error:", error.message);
        }
      } else {
        profile = data;
      }

    
      const logsResp = await supabase.from("logs").select("*").eq("user_id", userId);
      if (logsResp.error) console.error("logs fetch:", logsResp.error.message);

      const weightsResp = await supabase.from("weights").select("*").eq("user_id", userId);
      if (weightsResp.error) console.error("weights fetch:", weightsResp.error.message);

      const foodsResp = await supabase.from("foods").select("*").eq("user_id", userId);
      if (foodsResp.error) console.error("foods fetch:", foodsResp.error.message);

      const expensesResp = await supabase.from("expenses").select("*").eq("user_id", userId);
      if (expensesResp.error) console.error("expenses fetch:", expensesResp.error.message);

      let categoriesResp = await supabase.from("expense_categories").select("*").eq("user_id", userId);
      if (categoriesResp.error) console.error("expense_categories fetch:", categoriesResp.error.message);

      let expenseCategories: ExpenseCategory[] = (categoriesResp.data || []).map((c: Record<string, unknown>) => ({
        id: String(c.id),
        name: String(c.name),
      }));

      if (!expenseCategories.length && !categoriesResp.error) {
        const seed = [
          { user_id: userId, name: "Gym" },
          { user_id: userId, name: "Diet Foods" },
        ];
        const { data: inserted, error: seedErr } = await supabase.from("expense_categories").insert(seed).select();
        if (seedErr) {
          console.error("seed expense_categories:", seedErr.message);
        } else if (inserted) {
          expenseCategories = inserted.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: String(c.name),
          }));
        }
      }

      patch.auth = {
        isAuthenticated: true,
        email: email,
        name: profile?.name ?? undefined,
        age: profile?.age ?? undefined,
      };

      if (profile) {
        let tc: number | null = null;
        let tp: number | null = null;
        if (profile.target_calories !== undefined && profile.target_calories !== null) {
          const n = Number(profile.target_calories);
          if (!Number.isNaN(n)) tc = n;
        }
        if (profile.target_protein !== undefined && profile.target_protein !== null) {
          const n = Number(profile.target_protein);
          if (!Number.isNaN(n)) tp = n;
        }
        if (tc !== null) patch.targetCalories = tc;
if (tp !== null) patch.targetProtein = tp;

patch.profile = {
  startingWeight: profile.starting_weight !== null ? profile.starting_weight : useStore.getState().profile?.startingWeight ?? null,
  currentWeight: profile.current_weight !== null ? profile.current_weight : useStore.getState().profile?.currentWeight ?? null,
  targetWeight: profile.target_weight ?? null,
  weeks: profile.weeks ?? null,
};

        const hidden = profile.hidden_foods;
        if (Array.isArray(hidden)) {
          patch.hiddenDefaultFoodNames = hidden.map((n: string) => String(n).toLowerCase());
        }

        if (typeof profile.daily_reminder_enabled === "boolean") {
          patch.reminders = { dailySummary: profile.daily_reminder_enabled };
        }
      } else {
        patch.profile = null;
        patch.targetCalories = null;
        patch.targetProtein = null;
        if (pathname !== "/login") router.replace("/login?setup=true");
      }

      if (!logsResp.error && logsResp.data) {
        const logs: Record<string, DailySummary> = {};
        logsResp.data.forEach((log: Record<string, unknown>) => {
          const entries = normalizeLogEntries(log.entries);
          const totalCalories = Number(log.total_calories ?? 0);
          const totalProtein = Number(log.total_protein ?? 0);
          logs[String(log.date)] = { totalCalories, totalProtein, entries };
        });
        patch.logs = logs;
      }

      if (!weightsResp.error && weightsResp.data) {
        const weightLogs: Record<string, number> = {};
        weightsResp.data.forEach((w: Record<string, unknown>) => {
          weightLogs[String(w.date)] = Number(w.weight);
        });
        patch.weightLogs = weightLogs;
      }

      if (!foodsResp.error && foodsResp.data) {
        patch.customFoods = foodsResp.data.map((row) => mapFoodRow(row as Record<string, unknown>));
      }

      if (!expensesResp.error && expensesResp.data) {
        const expenses: Record<string, ExpenseEntry[]> = {};
        expensesResp.data.forEach((row: Record<string, unknown>) => {
          const date = String(row.date);
          const ts = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
          const entry: ExpenseEntry = {
            id: String(row.id),
            amount: Number(row.amount),
            category: String(row.category),
            date,
            timestamp: ts,
          };
          if (!expenses[date]) expenses[date] = [];
          expenses[date].push(entry);
        });
        patch.expenses = expenses;
      }

      if (expenseCategories.length) {
        patch.expenseCategories = expenseCategories;
      }

      if (DEBUG_HYDRATE) {
        console.log("[Gainly hydrate] profile row:", profile);
        console.log("[Gainly hydrate] patch applied:", {
          profile: patch.profile,
          targetCalories: patch.targetCalories,
          targetProtein: patch.targetProtein,
          weightDays: patch.weightLogs ? Object.keys(patch.weightLogs).length : undefined,
        });
      }
    } catch (e: unknown) {
      console.error("Error fetching user data:", e);
      const err = e as { code?: string };
      if (err?.code === "PGRST116") {
        patch.auth = { isAuthenticated: true, email: email };
        patch.profile = null;
        patch.targetCalories = null;
        patch.targetProtein = null;
        if (pathname !== "/login") router.replace("/login?setup=true");
      }
    } finally {
      useStore.setState((state) => {
        const next = { ...state, isDataLoaded: true as const };
        if (patch.auth) next.auth = { ...next.auth, ...patch.auth };
        if (patch.profile !== undefined) next.profile = patch.profile;
        if (patch.targetCalories !== undefined) next.targetCalories = patch.targetCalories;
        if (patch.targetProtein !== undefined) next.targetProtein = patch.targetProtein;
        if (patch.logs !== undefined) next.logs = patch.logs;
        if (patch.weightLogs !== undefined) next.weightLogs = patch.weightLogs;
        if (patch.customFoods !== undefined) next.customFoods = patch.customFoods;
        if (patch.expenses !== undefined) next.expenses = patch.expenses;
        if (patch.expenseCategories !== undefined) next.expenseCategories = patch.expenseCategories;
        if (patch.hiddenDefaultFoodNames !== undefined) next.hiddenDefaultFoodNames = patch.hiddenDefaultFoodNames;
        if (patch.reminders !== undefined) next.reminders = patch.reminders;
        return next;
      });

      if (DEBUG_HYDRATE) {
        const st = useStore.getState();
        console.log("[Gainly hydrate] store after apply:", {
          isDataLoaded: st.isDataLoaded,
          profile: st.profile,
          targetCalories: st.targetCalories,
          targetProtein: st.targetProtein,
        });
      }
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (!mounted || initializing || !auth.isAuthenticated || !isDataLoaded) return;

    const unsub = useStore.subscribe(() => {
      const st = useStore.getState();
      if (!st.auth.isAuthenticated || !st.isDataLoaded) return;

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      syncTimeoutRef.current = setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const state = useStore.getState();
        if (!state.isDataLoaded) return;

        if (state.profile) {
          const { error: profileErr } = await supabase
            .from("profiles")
            .update({
              starting_weight: state.profile.startingWeight,
              current_weight: state.profile.currentWeight,
              target_weight: state.profile.targetWeight,
              weeks: state.profile.weeks,
              target_calories: state.targetCalories,
              target_protein: state.targetProtein,
              hidden_foods: state.hiddenDefaultFoodNames,
              daily_reminder_enabled: state.reminders.dailySummary,
            })
            .eq("id", user.id);

            if (profileErr) {
              console.error("sync profiles:", profileErr.message);
              alert("PROFILE SAVE FAILED: " + profileErr.message);
            }        }

        const logsToUpsert = Object.entries(state.logs).map(([date, log]) => ({
          user_id: user.id,
          date,
          total_calories: log.totalCalories,
          total_protein: log.totalProtein,
          entries: log.entries,
        }));
        if (logsToUpsert.length > 0) {
          const { error } = await supabase.from("logs").upsert(logsToUpsert, {
            onConflict: "user_id,date",
          });
          if (error) console.error("sync logs:", error.message);
        }

        const weightsToUpsert = Object.entries(state.weightLogs).map(([date, weight]) => ({
          user_id: user.id,
          date,
          weight,
        }));
        if (weightsToUpsert.length > 0) {
          const { error } = await supabase.from("weights").upsert(weightsToUpsert, {
            onConflict: "user_id,date",
          });
          if (error) console.error("sync weights:", error.message);
        }

        const foodsToUpsert = state.customFoods.map((food) => ({
          id: food.id,
          user_id: user.id,
          name: food.name,
          unit: food.unit,
          calories_per_100g: food.calories_per_100g ?? null,
          protein_per_100g: food.protein_per_100g ?? null,
          calories_per_unit: food.calories_per_unit ?? null,
          protein_per_unit: food.protein_per_unit ?? null,
          calories_per_100ml: food.calories_per_100ml ?? null,
          protein_per_100ml: food.protein_per_100ml ?? null,
        }));
        if (foodsToUpsert.length > 0) {
          const { error } = await supabase.from("foods").upsert(foodsToUpsert, {
            onConflict: "user_id,name",
          });
          if (error) console.error("sync foods:", error.message);
        }

        const expenseRows = Object.values(state.expenses)
          .flat()
          .map((e) => ({
            id: e.id,
            user_id: user.id,
            date: e.date,
            amount: e.amount,
            category: e.category,
          }));
        if (expenseRows.length > 0) {
          const { error } = await supabase.from("expenses").upsert(expenseRows, { onConflict: "id" });
          if (error) console.error("sync expenses:", error.message);
        }
      }, 2000);
    });

    return () => unsub();
  }, [mounted, initializing, auth.isAuthenticated, isDataLoaded]);

  useEffect(() => {
    if (!mounted || initializing) return;

    if (!auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    } else if (auth.isAuthenticated && pathname === "/login" && isDataLoaded) {
      const setup =
        typeof window !== "undefined" && new URLSearchParams(window.location.search).get("setup") === "true";
      if (!setup) {
        router.replace("/");
      }
    }
  }, [mounted, initializing, auth.isAuthenticated, pathname, router, isDataLoaded]);

  if (!mounted || initializing) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (auth.isAuthenticated && !isDataLoaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted text-center">Loading your data…</p>
      </div>
    );
  }

  if (!auth.isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
