"use client";

import { useStore } from "@/store/useStore";
import { useState } from "react";
import { Plus, Trash2, Edit2, Wallet, Tag, X, Check, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getToday } from "@/lib/dateUtils";

export default function ExpensesPage() {
  const { expenses, expenseCategories, addExpenseCategory, removeExpenseCategory, addExpense, removeExpense } = useStore();
  
  // State
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(getToday());
  const [expenseCategory, setExpenseCategory] = useState(expenseCategories.length > 0 ? expenseCategories[0].name : "");
  const [newCatName, setNewCatName] = useState("");

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isManagingCat, setIsManagingCat] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Compute stats
  const allExpenses = Object.values(expenses).flat();
  const totalAllTime = allExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthExpenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalThisMonth = thisMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const categoryTotals = expenseCategories.map(cat => {
     const spent = allExpenses.filter(e => e.category === cat.name).reduce((acc, curr) => acc + curr.amount, 0);
     return { name: cat.name, spent };
  }).filter(c => c.spent > 0);

  // Split history into months visually
  const monthlyTotals = allExpenses.reduce((acc, curr) => {
    const d = new Date(curr.date);
    const monthYear = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = 0;
    acc[monthYear] += curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const monthlyList = Object.entries(monthlyTotals).map(([name, spent]) => ({ name, spent }));

  const handleAddExpense = () => {
     if (!expenseAmount || isNaN(Number(expenseAmount)) || !expenseCategory) return;
     
     if (editingExpenseId) {
       const existingExp = allExpenses.find(e => e.id === editingExpenseId);
       if (existingExp && existingExp.date !== expenseDate) {
          useStore.getState().removeExpense(existingExp.date, editingExpenseId);
          addExpense(expenseDate, { amount: Number(expenseAmount), category: expenseCategory });
       } else {
          useStore.getState().updateExpense(expenseDate, editingExpenseId, { amount: Number(expenseAmount), category: expenseCategory });
       }
       toast.success("Expense updated!");
     } else {
       addExpense(expenseDate, { amount: Number(expenseAmount), category: expenseCategory });
       toast.success("Expense added successfully");
     }
     
     setExpenseAmount("");
     setEditingExpenseId(null);
     setIsAddingExpense(false);
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    addExpenseCategory(newCatName);
    setNewCatName("");
    if (!expenseCategory) setExpenseCategory(newCatName);
  };

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 pb-safe overflow-y-auto">
      <header className="pt-4 pb-6 flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted text-sm mt-1">Track your fitness spending.</p>
         </div>
         <button onClick={() => setIsAddingExpense(true)} className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-colors">
            <Plus className="w-5 h-5" />
         </button>
      </header>

      {/* SPLIT DASHBOARD METRICS */}
      <section className="grid grid-cols-2 gap-4 mb-8">
         <div className="bg-surface border border-white/5 rounded-3xl p-5 shadow-lg shadow-black/20 flex flex-col justify-center active:scale-[0.98] transition-transform relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5">
               <Wallet className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Total Expenses</p>
            <h2 className="text-2xl font-extrabold text-white tracking-tight relative z-10 w-full truncate">
              <span className="text-muted/50 font-normal mr-0.5">₹</span>{totalAllTime.toLocaleString()}
            </h2>
         </div>
         <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 shadow-lg shadow-black/20 flex flex-col justify-center active:scale-[0.98] transition-transform relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 text-primary">
               <Wallet className="w-12 h-12" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">This Month</p>
            <h2 className="text-2xl font-extrabold text-primary drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] tracking-tight relative z-10 w-full truncate">
              <span className="text-primary/50 font-normal mr-0.5">₹</span>{totalThisMonth.toLocaleString()}
            </h2>
         </div>
      </section>

      {/* CATEGORY BREAKDOWN */}
      <section className="mb-6">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Category Breakdown</h2>
            <button onClick={() => setIsManagingCat(true)} className="text-xs font-bold text-primary active:scale-95">Manage</button>
         </div>
         <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            {categoryTotals.length === 0 ? (
               <div className="bg-surface border border-white/5 px-4 py-3 rounded-2xl text-sm text-muted">No expenses recorded yet.</div>
            ) : (
              categoryTotals.map(cat => (
                <div key={cat.name} className="bg-surface border border-white/5 px-5 py-4 rounded-3xl flex-shrink-0 min-w-[140px] flex flex-col gap-2">
                   <span className="text-xs font-semibold text-muted tracking-widest uppercase truncate">{cat.name}</span>
                   <span className="font-bold text-xl">₹{cat.spent.toLocaleString()}</span>
                </div>
              ))
            )}
         </div>
      </section>

      {/* HISTORY TABLE */}
      <section className="flex-1 pb-10">
         <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-4">History</h2>
         <div className="space-y-3">
            {allExpenses.sort((a,b) => b.timestamp - a.timestamp).map(exp => (
               <div key={exp.id} className="flex justify-between items-center bg-surface border border-white/5 p-4 rounded-2xl group">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm tracking-wide">{exp.category}</span>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-muted">{exp.date}</span>
                    </div>
                    <span className="font-bold text-lg text-primary">₹{exp.amount.toLocaleString()}</span>
                 </div>
                 <div className="flex gap-1">
                    <button onClick={() => {
                        setExpenseAmount(exp.amount.toString());
                        setExpenseCategory(exp.category);
                        setExpenseDate(exp.date);
                        setEditingExpenseId(exp.id);
                        setIsAddingExpense(true);
                    }} className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white transition-colors">
                       <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => removeExpense(exp.date, exp.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 opacity-50 hover:bg-red-500/10 active:opacity-100 transition-colors">
                       <Trash2 className="w-4 h-4"/>
                    </button>
                 </div>
               </div>
            ))}
            {allExpenses.length === 0 && <div className="text-center text-muted p-6 border border-white/5 border-dashed rounded-3xl">No expenses recorded yet.</div>}
         </div>
      </section>

      {/* ADD/EDIT EXPENSE MODAL */}
      <AnimatePresence>
        {isAddingExpense && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 p-6 rounded-t-[32px] z-50 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold">{editingExpenseId ? "Edit Expense" : "New Expense"}</h2>
                 <button onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }}><X className="w-5 h-5 text-muted" /></button>
              </div>
              <div className="space-y-4">
                 <div>
                   <label className="text-xs uppercase text-muted font-bold block mb-1">Amount (₹)</label>
                   <input type="number" placeholder="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs uppercase text-muted font-bold block mb-1">Category</label>
                     <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                       {expenseCategories.map(c => (
                         <option key={c.id} value={c.name}>{c.name}</option>
                       ))}
                     </select>
                   </div>
                   <div>
                     <label className="text-xs uppercase text-muted font-bold block mb-1">Date</label>
                     <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                   </div>
                 </div>
                 <button onClick={handleAddExpense} className="w-full py-4 mt-2 bg-primary text-background rounded-2xl font-bold text-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><Check className="w-5 h-5"/> Save Expense</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CATEGORY MANAGER MODAL */}
      <AnimatePresence>
        {isManagingCat && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManagingCat(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 p-6 rounded-t-[32px] z-50">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold">Categories</h2>
                 <button onClick={() => setIsManagingCat(false)}><X className="w-5 h-5 text-muted" /></button>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto mb-4 border border-white/5 rounded-2xl p-2 bg-background">
                 {expenseCategories.map(cat => (
                   <div key={cat.id} className="flex justify-between items-center p-3 bg-surface rounded-xl">
                      <span className="font-bold text-sm tracking-wide">{cat.name}</span>
                      <button onClick={() => removeExpenseCategory(cat.id)} className="text-red-500 opacity-50 active:opacity-100 p-2"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 ))}
                 {expenseCategories.length === 0 && <p className="text-muted text-sm p-4 text-center">No categories exist.</p>}
              </div>
              
              <div className="flex gap-2">
                 <input type="text" placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                 <button onClick={handleAddCategory} className="px-5 bg-white/10 text-white rounded-xl font-bold text-sm active:scale-95"><Plus className="w-5 h-5"/></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
