import { create } from "zustand";
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

/** Empty profile object for first-time edits (DB row may not exist yet). */
export const emptyUserProfile = (): UserProfile => ({
  startingWeight: null,
  currentWeight: null,
  targetWeight: null,
  weeks: null,
});

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
  /** True only after Supabase user payload has been applied (session + profile/weights/targets fetch). */
  isDataLoaded: boolean;
  targetCalories: number | null;
  targetProtein: number | null;
  logs: Record<string, DailySummary>;
  weightLogs: Record<string, number>;
  expenses: Record<string, ExpenseEntry[]>;
  expenseCategories: ExpenseCategory[];
  customFoods: FoodEntryDB[];
  /** Lowercased names hidden from bundled catalog (stored in profiles.hidden_foods). */
  hiddenDefaultFoodNames: string[];
  /** null until hydrated from Supabase (or no profile row yet — onboarding). */
  profile: UserProfile | null;
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

export function mapFoodRow(row: Record<string, any>): FoodEntryDB {
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

export const useStore = create<AppState>()((set) => ({
  isDataLoaded: false,
  targetCalories: null,
  targetProtein: null,
  logs: {},
  weightLogs: {},
  expenses: {},
  expenseCategories: defaultExpenseCategories(),
  customFoods: [],
  hiddenDefaultFoodNames: [],
  profile: null,
  auth: {
    isAuthenticated: false,
  },
  reminders: {
    dailySummary: false,
  },
  setTargets: (calories, protein) => set({ targetCalories: calories, targetProtein: protein }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...(state.profile ?? emptyUserProfile()), ...updates },
    })),
  updateAuth: (updates) => set((state) => ({ auth: { ...state.auth, ...updates } })),
  logout: () =>
    set({
      isDataLoaded: false,
      auth: { isAuthenticated: false },
      logs: {},
      weightLogs: {},
      expenses: {},
      expenseCategories: defaultExpenseCategories(),
      customFoods: [],
      hiddenDefaultFoodNames: [],
      profile: null,
      targetCalories: null,
      targetProtein: null,
      reminders: { dailySummary: false },
    }),
  clearData: () =>
    set({
      isDataLoaded: false,
      logs: {},
      weightLogs: {},
      expenses: {},
      expenseCategories: defaultExpenseCategories(),
      customFoods: [],
      hiddenDefaultFoodNames: [],
      profile: null,
      targetCalories: null,
      targetProtein: null,
      reminders: { dailySummary: false },
    }),
  updateReminders: (updates) =>
    set((state) => ({ reminders: { ...state.reminders, ...updates } })),

  addCustomFood: (food) => {
    const tempId = newId();

    // ✅ 1. INSTANT UI UPDATE (OPTIMISTIC)
    set((state) => ({
      customFoods: [
        ...state.customFoods,
        {
          id: tempId,
          name: food.name,
          unit: food.unit,
          calories_per_100g: food.calories_per_100g,
          protein_per_100g: food.protein_per_100g,
          calories_per_unit: food.calories_per_unit,
          protein_per_unit: food.protein_per_unit,
          calories_per_100ml: food.calories_per_100ml,
          protein_per_100ml: food.protein_per_100ml,
          timestamp: Date.now(),
        },
      ],
    }));

    // ✅ 2. SAVE TO DB
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("foods")
        .insert({
          user_id: user.id,
          name: food.name,
          unit: food.unit,
          calories_per_100g: food.calories_per_100g ?? null,
          protein_per_100g: food.protein_per_100g ?? null,
          calories_per_unit: food.calories_per_unit ?? null,
          protein_per_unit: food.protein_per_unit ?? null,
          calories_per_100ml: food.calories_per_100ml ?? null,
          protein_per_100ml: food.protein_per_100ml ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("Add food error:", error.message);
        return;
      }

      // ✅ 3. REPLACE TEMP WITH REAL DATA
      set((state) => ({
        customFoods: state.customFoods.map((f) =>
          f.id === tempId ? mapFoodRow(data) : f
        ),
      }));
    })();
  },
  updateCustomFood: (id, updates) => {
    // ✅ 1. INSTANT UI UPDATE
    set((state) => ({
      customFoods: state.customFoods.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));

    // ✅ 2. SAVE TO DB
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("foods")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Update food error:", error.message);
        return;
      }

      // ✅ 3. SYNC FINAL DATA
      set((state) => ({
        customFoods: state.customFoods.map((f) =>
          f.id === id ? mapFoodRow(data) : f
        ),
      }));
    })();
  },
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
      profile: { ...(state.profile ?? emptyUserProfile()), currentWeight: weight },
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
}));
