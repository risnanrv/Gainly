"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import foodDB from "@/data/foods.json";
import { Plus, Edit2, Trash2, Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

export default function FoodsPage() {
  const { customFoods, addCustomFood, updateCustomFood, deleteCustomFood } = useStore();
  const [search, setSearch] = useState("");
  const [editingFood, setEditingFood] = useState<any>(null); // any for simplified form handling
  const [isAdding, setIsAdding] = useState(false);

  // Merge the base DB and custom overriding foods
  const baseMap = new Map();
  foodDB.forEach(f => baseMap.set(f.name.toLowerCase(), f));
  customFoods.forEach(f => baseMap.set(f.name.toLowerCase(), f));
  
  const allFoods = Array.from(baseMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredList = search 
    ? allFoods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : allFoods;

  const handleSave = () => {
    if (!editingFood.name) return toast.error("Name is required");
    
    // Distinguish if it's new, custom update, or overriding base food
    if (editingFood.id) {
       updateCustomFood(editingFood.id, editingFood);
       toast.success("Food updated!");
    } else {
       addCustomFood(editingFood);
       toast.success("Added to your foods!");
    }
    setEditingFood(null);
    setIsAdding(false);
  };

  const openForm = (food?: any) => {
    if (food) {
        setEditingFood(food);
        setIsAdding(true);
    } else {
        setEditingFood({ name: "", unit: "grams", calories_per_100g: 0, protein_per_100g: 0 });
        setIsAdding(true);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 pb-safe">
      <header className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-4">
           <h1 className="text-2xl font-bold tracking-tight">Food Database</h1>
           <button onClick={() => openForm()} className="w-10 h-10 rounded-xl bg-highlight/10 text-highlight flex items-center justify-center active:scale-95 transition-colors">
              <Plus className="w-5 h-5 pointer-events-none" />
           </button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search all foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/50"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar -mx-6 px-6">
        <div className="space-y-2">
           {filteredList.map(food => {
             const isCustom = !!food.id || customFoods.some(c => c.name.toLowerCase() === food.name.toLowerCase());
             return (
               <div key={food.name} className="flex justify-between items-center p-4 bg-surface border border-white/5 rounded-2xl">
                 <div>
                    <h3 className="font-semibold text-sm">{food.name}</h3>
                    <p className="text-xs text-muted mt-0.5">
                       {food.unit === "count" 
                         ? `${food.calories_per_unit} kcal / ${food.protein_per_unit || 0}g protein per unit`
                         : `${food.calories_per_100g} kcal / ${food.protein_per_100g || 0}g protein per 100g`}
                    </p>
                    {isCustom && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md mt-1 inline-block">Personal</span>}
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => openForm(food)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-muted hover:text-foreground active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isCustom && food.id && (
                       <button 
                         onClick={() => {
                            deleteCustomFood(food.id);
                            toast.success("Food deleted");
                         }}
                         className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 active:scale-95"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    )}
                 </div>
               </div>
             )
           })}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && editingFood && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAdding(false); setEditingFood(null); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 p-6 rounded-t-[32px] z-50 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold">{editingFood.id ? 'Edit Food' : 'New Food'}</h2>
                 <button onClick={() => { setIsAdding(false); setEditingFood(null); }}>
                   <X className="w-5 h-5 text-muted" />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                   <label className="text-xs uppercase text-muted font-bold block mb-1">Food Name</label>
                   <input type="text" value={editingFood.name} onChange={e => setEditingFood({...editingFood, name: e.target.value})} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3" />
                 </div>
                 
                 <div>
                   <label className="text-xs uppercase text-muted font-bold block mb-1">Measurement Type</label>
                   <div className="flex bg-background rounded-xl p-1 border border-white/5">
                      <button onClick={() => setEditingFood({...editingFood, unit: 'grams', calories_per_unit: undefined, protein_per_unit: undefined, calories_per_100g: editingFood.calories_per_100g || 0, protein_per_100g: editingFood.protein_per_100g || 0})} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${editingFood.unit === 'grams' ? 'bg-primary text-background' : 'text-muted'}`}>Grams (100g base)</button>
                      <button onClick={() => setEditingFood({...editingFood, unit: 'count', calories_per_100g: undefined, protein_per_100g: undefined, calories_per_unit: editingFood.calories_per_unit || 0, protein_per_unit: editingFood.protein_per_unit || 0})} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${editingFood.unit === 'count' ? 'bg-primary text-background' : 'text-muted'}`}>Units (count)</button>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs uppercase text-muted font-bold block mb-1">Calories {editingFood.unit === 'count' ? 'per unit' : 'per 100g'}</label>
                      <input type="number" value={editingFood.unit === 'count' ? editingFood.calories_per_unit : editingFood.calories_per_100g} onChange={e => editingFood.unit === 'count' ? setEditingFood({...editingFood, calories_per_unit: Number(e.target.value)}) : setEditingFood({...editingFood, calories_per_100g: Number(e.target.value)})} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-lg font-bold" />
                   </div>
                   <div>
                      <label className="text-xs uppercase text-muted font-bold block mb-1">Protein {editingFood.unit === 'count' ? 'per unit' : 'per 100g'}</label>
                      <input type="number" value={editingFood.unit === 'count' ? editingFood.protein_per_unit : editingFood.protein_per_100g} onChange={e => editingFood.unit === 'count' ? setEditingFood({...editingFood, protein_per_unit: Number(e.target.value)}) : setEditingFood({...editingFood, protein_per_100g: Number(e.target.value)})} className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-lg font-bold" />
                   </div>
                 </div>

                 <button onClick={handleSave} className="w-full py-4 mt-2 bg-primary text-background rounded-2xl font-bold text-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><Check className="w-5 h-5"/> Save Food Properties</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
