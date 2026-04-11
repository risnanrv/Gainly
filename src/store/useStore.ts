import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  unit: 'count' | 'grams' | 'ml';
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
  
  // Custom Food DB CRUD
  addCustomFood: (food: Omit<FoodEntryDB, "id" | "timestamp">) => void;
  updateCustomFood: (id: string, updates: Partial<FoodEntryDB>) => void;
  deleteCustomFood: (id: string) => void;
  
  addWeight: (date: string, weight: number) => void;
  addExpense: (date: string, entry: Omit<ExpenseEntry, "id" | "timestamp" | "date">) => void;
  updateExpense: (date: string, id: string, updates: Partial<ExpenseEntry>) => void;
  removeExpense: (date: string, id: string) => void;
  addExpenseCategory: (name: string) => void;
  removeExpenseCategory: (id: string) => void;
  clearData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      targetCalories: null,
      targetProtein: null,
      logs: {},
      weightLogs: {},
      expenses: {},
      expenseCategories: [
        { id: "cat_gym", name: "Gym" },
        { id: "cat_diet", name: "Diet Foods" }
      ],
      customFoods: [],
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
      setTargets: (calories, protein) =>
        set({ targetCalories: calories, targetProtein: protein }),
      updateProfile: (updates) =>
        set((state) => ({ profile: { ...state.profile, ...updates } })),
      updateAuth: (updates) =>
        set((state) => ({ auth: { ...state.auth, ...updates } })),
      logout: () => set({ auth: { isAuthenticated: false } }),
      clearData: () => 
        set({ 
           logs: {}, 
           weightLogs: {}, 
           expenses: {}, 
           expenseCategories: [{ id: "cat_gym", name: "Gym" }, { id: "cat_diet", name: "Diet Foods" }], 
           customFoods: [],
           profile: { startingWeight: null, currentWeight: null, targetWeight: null, weeks: null },
           targetCalories: null,
           targetProtein: null
        }),
      updateReminders: (updates) =>
        set((state) => ({ reminders: { ...state.reminders, ...updates } })),
      
      addCustomFood: (food) =>
        set((state) => {
           // Prevent duplicate names locally
           if (state.customFoods.some(f => f.name.toLowerCase() === food.name.toLowerCase())) {
              return state;
           }
           return {
             customFoods: [...state.customFoods, { ...food, id: Math.random().toString(36).substring(7), timestamp: Date.now() }]
           };
        }),
      updateCustomFood: (id, updates) =>
        set((state) => ({
          customFoods: state.customFoods.map(f => f.id === id ? { ...f, ...updates } : f)
        })),
      deleteCustomFood: (id) =>
        set((state) => ({
          customFoods: state.customFoods.filter(f => f.id !== id)
        })),
      addWeight: (date, weight) =>
        set((state) => ({
          weightLogs: { ...state.weightLogs, [date]: weight },
          profile: { ...state.profile, currentWeight: weight }
        })),
      addExpense: (date, entry) =>
        set((state) => {
          const dayExpenses = state.expenses[date] || [];
          const newId = Math.random().toString(36).substring(7);
          return {
            expenses: {
              ...state.expenses,
              [date]: [...dayExpenses, { ...entry, id: newId, timestamp: Date.now(), date }]
            }
          };
        }),
      updateExpense: (date, id, updates) => 
        set((state) => {
          const dayExpenses = state.expenses[date] || [];
          return {
            expenses: {
              ...state.expenses,
              [date]: dayExpenses.map(e => e.id === id ? { ...e, ...updates } : e)
            }
          };
        }),
      removeExpense: (date, id) =>
        set((state) => {
           const dayExpenses = state.expenses[date] || [];
           return {
             expenses: {
               ...state.expenses,
               [date]: dayExpenses.filter(e => e.id !== id)
             }
           };
        }),
      addExpenseCategory: (name) =>
        set((state) => {
           if (state.expenseCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
             return state;
           }
           return {
             expenseCategories: [
               ...state.expenseCategories, 
               { id: `cat_${Math.random().toString(36).substring(7)}`, name }
             ]
           }
        }),
      removeExpenseCategory: (id) =>
        set((state) => ({
           expenseCategories: state.expenseCategories.filter(c => c.id !== id)
        })),
      addFood: (date, entry) =>
        set((state) => {
          const currentDay = state.logs[date] || { totalCalories: 0, totalProtein: 0, entries: [] };
          const newEntry = {
            ...entry,
            id: Math.random().toString(36).substring(7),
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
      name: "gainly-storage",
    }
  )
);
