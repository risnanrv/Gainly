import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  timestamp: number;
}

export interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  entries: FoodEntry[];
}

export interface ExpenseEntry {
  id: string;
  amount: number;
  category: string;
  date: string;
  timestamp: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface UserProfile {
  email?: string;
  startingWeight: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  weeks: number | null;
  manualCalories?: number;
  manualProtein?: number;
}

export interface Reminders {
  dailySummary: boolean;
}

export interface FoodEntryDB {
  id: string;
  name: string;
  unit: "count" | "grams" | "ml";
  calories_per_unit?: number;
  protein_per_unit?: number;
  calories_per_100g?: number;
  protein_per_100g?: number;
  calories_per_100ml?: number;
  protein_per_100ml?: number;
  timestamp: number;
}

export interface UserAuth {
  isAuthenticated: boolean;
  name?: string;
  email?: string;
  age?: number;
}

interface AppState {
  targetCalories: number | null;
  targetProtein: number | null;
  logs: Record<string, DailySummary>;
  weightLogs: Record<string, number>;
  expenses: Record<string, ExpenseEntry[]>;
  expenseCategories: ExpenseCategory[];
  customFoods: FoodEntryDB[];
  /** Lowercased names hidden from bundled catalog (stored in profiles.hidden_foods). */
  hiddenDefaultFoodNames: string[];
  profile: UserProfile;
  auth: UserAuth;
  reminders: Reminders;
  setTargets: (calories: number | null, protein: number | null) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateAuth: (auth: Partial<UserAuth>) => void;
  logout: () => void;
  updateReminders: (reminders: Partial<Reminders>) => void;
  addFood: (date: string, entry: Omit<FoodEntry, "id" | "timestamp">) => void;
  removeFood: (date: string, id: string) => void;

  addCustomFood: (food: Omit<FoodEntryDB, "id" | "timestamp">) => void;
  updateCustomFood: (id: string, updates: Partial<FoodEntryDB>) => void;
  deleteCustomFood: (id: string) => void;
  hideDefaultFood: (name: string) => void;

  addWeight: (date: string, weight: number) => void;
  addExpense: (date: string, entry: Omit<ExpenseEntry, "id" | "timestamp" | "date">) => void;
  updateExpense: (date: string, id: string, updates: Partial<ExpenseEntry>) => void;
  removeExpense: (date: string, id: string) => void;
  addExpenseCategory: (name: string) => void;
  removeExpenseCategory: (id: string) => void;
  clearData: () => void;
}

/** Stable client-side UUIDs until hydrated from Supabase after auth. */
const defaultExpenseCategories = (): ExpenseCategory[] => [
  { id: "00000000-0000-4000-8000-000000000001", name: "Gym" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Diet Foods" },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      targetCalories: null,
      targetProtein: null,
      logs: {},
      weightLogs: {},
      expenses: {},
      expenseCategories: defaultExpenseCategories(),
      customFoods: [],
      hiddenDefaultFoodNames: [],
      profile: {
        startingWeight: null,
        currentWeight: null,
        targetWeight: null,
        weeks: null,
      },
      auth: {
        isAuthenticated: false,
      },
      reminders: {
        dailySummary: false,
      },
      setTargets: (calories, protein) => set({ targetCalories: calories, targetProtein: protein }),
      updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
      updateAuth: (updates) => set((state) => ({ auth: { ...state.auth, ...updates } })),
      logout: () =>
        set({
          auth: { isAuthenticated: false },
          logs: {},
          weightLogs: {},
          expenses: {},
          expenseCategories: defaultExpenseCategories(),
          customFoods: [],
          hiddenDefaultFoodNames: [],
          profile: {
            startingWeight: null,
            currentWeight: null,
            targetWeight: null,
            weeks: null,
          },
          targetCalories: null,
          targetProtein: null,
          reminders: { dailySummary: false },
        }),
      clearData: () =>
        set({
          logs: {},
          weightLogs: {},
          expenses: {},
          expenseCategories: defaultExpenseCategories(),
          customFoods: [],
          hiddenDefaultFoodNames: [],
          profile: {
            startingWeight: null,
            currentWeight: null,
            targetWeight: null,
            weeks: null,
          },
          targetCalories: null,
          targetProtein: null,
          reminders: { dailySummary: false },
        }),
      updateReminders: (updates) =>
        set((state) => ({ reminders: { ...state.reminders, ...updates } })),

      addCustomFood: (food) =>
        set((state) => {
          if (state.customFoods.some((f) => f.name.toLowerCase() === food.name.toLowerCase())) {
            return state;
          }
          return {
            customFoods: [
              ...state.customFoods,
              { ...food, id: newId(), timestamp: Date.now() },
            ],
          };
        }),
      updateCustomFood: (id, updates) =>
        set((state) => ({
          customFoods: state.customFoods.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
      deleteCustomFood: (id) => {
        void (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from("foods").delete().eq("id", id).eq("user_id", user.id);
            if (error) console.error("deleteCustomFood:", error.message);
          }
        })();
        set((state) => ({
          customFoods: state.customFoods.filter((f) => f.id !== id),
        }));
      },
      hideDefaultFood: (name) =>
        set((state) => {
          const key = name.trim().toLowerCase();
          if (!key || state.hiddenDefaultFoodNames.includes(key)) return state;
          return { hiddenDefaultFoodNames: [...state.hiddenDefaultFoodNames, key] };
        }),

      addWeight: (date, weight) =>
        set((state) => ({
          weightLogs: { ...state.weightLogs, [date]: weight },
          profile: { ...state.profile, currentWeight: weight },
        })),
      addExpense: (date, entry) =>
        set((state) => {
          const dayExpenses = state.expenses[date] || [];
          const newIdVal = newId();
          return {
            expenses: {
              ...state.expenses,
              [date]: [...dayExpenses, { ...entry, id: newIdVal, timestamp: Date.now(), date }],
            },
          };
        }),
      updateExpense: (date, id, updates) =>
        set((state) => {
          const dayExpenses = state.expenses[date] || [];
          return {
            expenses: {
              ...state.expenses,
              [date]: dayExpenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
            },
          };
        }),
      removeExpense: (date, id) => {
        void (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
            if (error) console.error("removeExpense:", error.message);
          }
        })();
        set((state) => {
          const dayExpenses = state.expenses[date] || [];
          return {
            expenses: {
              ...state.expenses,
              [date]: dayExpenses.filter((e) => e.id !== id),
            },
          };
        });
      },
      addExpenseCategory: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        void (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data, error } = await supabase
              .from("expense_categories")
              .insert({ user_id: user.id, name: trimmed })
              .select("id, name")
              .single();
            if (!error && data) {
              set((state) => {
                if (state.expenseCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
                  return state;
                }
                return { expenseCategories: [...state.expenseCategories, { id: data.id, name: data.name }] };
              });
              return;
            }
            if (error) console.error("addExpenseCategory:", error.message);
          }
          set((state) => {
            if (state.expenseCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
              return state;
            }
            return { expenseCategories: [...state.expenseCategories, { id: newId(), name: trimmed }] };
          });
        })();
      },
      removeExpenseCategory: (id) => {
        void (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase
              .from("expense_categories")
              .delete()
              .eq("id", id)
              .eq("user_id", user.id);
            if (error) console.error("removeExpenseCategory:", error.message);
          }
        })();
        set((state) => ({
          expenseCategories: state.expenseCategories.filter((c) => c.id !== id),
        }));
      },
      addFood: (date, entry) =>
        set((state) => {
          const currentDay = state.logs[date] || { totalCalories: 0, totalProtein: 0, entries: [] };
          const newEntry: FoodEntry = {
            ...entry,
            id: newId(),
            timestamp: Date.now(),
          };
          return {
            logs: {
              ...state.logs,
              [date]: {
                totalCalories: currentDay.totalCalories + entry.calories,
                totalProtein: currentDay.totalProtein + entry.protein,
                entries: [...currentDay.entries, newEntry],
              },
            },
          };
        }),
      removeFood: (date, id) =>
        set((state) => {
          const currentDay = state.logs[date];
          if (!currentDay) return state;

          const entryToRemove = currentDay.entries.find((e) => e.id === id);
          if (!entryToRemove) return state;

          return {
            logs: {
              ...state.logs,
              [date]: {
                totalCalories: currentDay.totalCalories - entryToRemove.calories,
                totalProtein: currentDay.totalProtein - entryToRemove.protein,
                entries: currentDay.entries.filter((e) => e.id !== id),
              },
            },
          };
        }),
    }),
    {
      // New key so old blobs (which stored profile/targets/weights) cannot overwrite Supabase after rehydrate.
      name: "gainly-storage-v3",
      // Server-owned fields must come from Supabase only (AuthWrapper fetch + sync). Persisting them
      // caused async rehydration to merge stale localStorage over fresh DB values after refresh.
      partialize: (state) => ({
        reminders: state.reminders,
      }),
      merge: (persisted, current) => {
        const pr = (persisted as Partial<AppState> | null | undefined)?.reminders;
        return {
          ...current,
          reminders: pr ? { ...current.reminders, ...pr } : current.reminders,
        };
      },
    }
  )
);
