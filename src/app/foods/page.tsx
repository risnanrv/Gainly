"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import foodDB from "@/data/foods.json";
import { Plus, Edit2, Trash2, Search, X, Check, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FoodsPage() {
  const router = useRouter();
  const { customFoods, addCustomFood, updateCustomFood, deleteCustomFood } = useStore();
  const [search, setSearch] = useState("");
  const [editingFood, setEditingFood] = useState<any>(null);
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
    
    if (editingFood.id) {
       updateCustomFood(editingFood.id, editingFood);
       toast.success(`Updated ${editingFood.name}`);
    } else {
       addCustomFood(editingFood);
       toast.success(`Added ${editingFood.name} to Database`);
    }
    setEditingFood(null);
    setIsAdding(false);
  };

  const handleDelete = (food: any) => {
    if (window.confirm(`Are you sure you want to delete ${food.name}?`)) {
       deleteCustomFood(food.id);
       toast.success(`Deleted ${food.name}`);
    }
  };

  const openForm = (food?: any) => {
    if (food) {
        setEditingFood({ ...food });
        setIsAdding(true);
    } else {
        setEditingFood({ name: "", unit: "grams", calories_per_100g: "", protein_per_100g: "" });
        setIsAdding(true);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 pb-safe">
      <header className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted active:scale-95 transition-colors">
                <ChevronLeft className="w-6 h-6" />
             </button>
             <h1 className="text-2xl font-bold tracking-tight">Database</h1>
           </div>
           <button onClick={() => openForm()} className="h-10 px-4 rounded-xl bg-primary text-background font-bold tracking-wide text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 stroke-[3]" /> Add Food
           </button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
          <input
            type="text"
            placeholder="Search all foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/50 shadow-inner"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar -mx-6 px-6">
        <div className="space-y-3 mt-2">
           {filteredList.map(food => {
             const isCustom = !!food.id || customFoods.some(c => c.name.toLowerCase() === food.name.toLowerCase());
             return (
               <div key={food.name} className="flex justify-between items-center p-4 bg-surface border border-white/5 rounded-[20px] transition-colors hover:bg-surface/80">
                 <div>
                    <h3 className="font-bold text-sm tracking-wide">{food.name}</h3>
                    <p className="text-xs text-muted mt-1 font-medium">
                       {food.unit === "count" 
                         ? `${food.calories_per_unit || 0} kcal / ${food.protein_per_unit || 0}g per unit`
                         : food.unit === "ml"
                         ? `${food.calories_per_100ml || 0} kcal / ${food.protein_per_100ml || 0}g per 100ml`
                         : `${food.calories_per_100g || 0} kcal / ${food.protein_per_100g || 0}g per 100g`}
                    </p>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => openForm(food)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-muted hover:text-foreground active:scale-90 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isCustom && food.id && (
                       <button 
                         onClick={() => handleDelete(food)}
                         className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 active:scale-90 transition-all hover:bg-red-500/20"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    )}
                 </div>
               </div>
             )
           })}
           {filteredList.length === 0 && (
              <div className="text-center py-12 text-muted text-sm border border-white/5 border-dashed rounded-[24px]">
                 No foods found.
                 <br />
                 <button onClick={() => openForm()} className="text-primary font-bold mt-2 hidden">Add Custom Food</button>
              </div>
           )}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 p-6 rounded-t-[32px] z-[101] pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-start mb-6">
                 <div>
                   <h2 className="text-2xl font-black tracking-tight">{editingFood.id ? 'Edit Food' : 'New Food'}</h2>
                   <p className="text-sm text-muted mt-1">Configure database entry format</p>
                 </div>
                 <button onClick={() => { setIsAdding(false); setEditingFood(null); }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center p-1 active:scale-95 transition-transform shrink-0">
                   <X className="w-4 h-4 text-muted" />
                 </button>
              </div>

              <div className="space-y-5">
                 <div>
                   <label className="text-[10px] uppercase text-muted font-bold tracking-wider block mb-1.5 px-1">Food Name *</label>
                   <input type="text" placeholder="e.g. Chicken Breast" value={editingFood.name} onChange={e => setEditingFood({...editingFood, name: e.target.value})} className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-base shadow-inner font-bold placeholder:text-muted/40" />
                 </div>
                 
                 <div>
                   <label className="text-[10px] uppercase text-muted font-bold tracking-wider block mb-1.5 px-1">Measurement Type</label>
                   <div className="flex bg-background rounded-2xl p-1.5 border border-white/5 shadow-inner">
                      <button onClick={() => setEditingFood({...editingFood, unit: 'grams', calories_per_unit: undefined, protein_per_unit: undefined, calories_per_100ml: undefined, protein_per_100ml: undefined, calories_per_100g: editingFood.calories_per_100g || "", protein_per_100g: editingFood.protein_per_100g || ""})} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${editingFood.unit === 'grams' ? 'bg-primary text-background shadow-md' : 'text-muted hover:text-foreground'}`}>Grams</button>
                      <button onClick={() => setEditingFood({...editingFood, unit: 'count', calories_per_100g: undefined, protein_per_100g: undefined, calories_per_100ml: undefined, protein_per_100ml: undefined, calories_per_unit: editingFood.calories_per_unit || "", protein_per_unit: editingFood.protein_per_unit || ""})} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${editingFood.unit === 'count' ? 'bg-primary text-background shadow-md' : 'text-muted hover:text-foreground'}`}>Units</button>
                      <button onClick={() => setEditingFood({...editingFood, unit: 'ml', calories_per_100g: undefined, protein_per_100g: undefined, calories_per_unit: undefined, protein_per_unit: undefined, calories_per_100ml: editingFood.calories_per_100ml || "", protein_per_100ml: editingFood.protein_per_100ml || ""})} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${editingFood.unit === 'ml' ? 'bg-primary text-background shadow-md' : 'text-muted hover:text-foreground'}`}>mL</button>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-background border border-white/5 rounded-2xl p-3 shadow-inner">
                      <label className="text-[10px] uppercase text-muted font-bold tracking-wider block mb-2 text-center">Calories {editingFood.unit === 'count' ? 'per unit' : editingFood.unit === 'ml' ? '/ 100ml' : '/ 100g'}</label>
                      <input type="number" min="0" placeholder="0" value={editingFood.unit === 'count' ? editingFood.calories_per_unit : editingFood.unit === 'ml' ? editingFood.calories_per_100ml : editingFood.calories_per_100g} onChange={e => editingFood.unit === 'count' ? setEditingFood({...editingFood, calories_per_unit: Number(e.target.value)}) : editingFood.unit === 'ml' ? setEditingFood({...editingFood, calories_per_100ml: Number(e.target.value)}) : setEditingFood({...editingFood, calories_per_100g: Number(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-center focus:outline-none placeholder:text-muted/30" />
                   </div>
                   <div className="bg-background border border-white/5 rounded-2xl p-3 shadow-inner">
                      <label className="text-[10px] uppercase text-muted font-bold tracking-wider block mb-2 text-center">Protein {editingFood.unit === 'count' ? 'per unit' : editingFood.unit === 'ml' ? '/ 100ml' : '/ 100g'}</label>
                      <input type="number" min="0" placeholder="0" value={editingFood.unit === 'count' ? editingFood.protein_per_unit : editingFood.unit === 'ml' ? editingFood.protein_per_100ml : editingFood.protein_per_100g} onChange={e => editingFood.unit === 'count' ? setEditingFood({...editingFood, protein_per_unit: Number(e.target.value)}) : editingFood.unit === 'ml' ? setEditingFood({...editingFood, protein_per_100ml: Number(e.target.value)}) : setEditingFood({...editingFood, protein_per_100g: Number(e.target.value)})} className="w-full bg-transparent text-2xl font-black text-center focus:outline-none placeholder:text-muted/30" />
                   </div>
                 </div>

                 <button onClick={handleSave} className="w-full py-4 mt-4 bg-primary text-background rounded-2xl font-black tracking-wide text-lg flex justify-center items-center gap-2 active:scale-95 transition-transform"><Check className="w-5 h-5 stroke-[3]"/> Save Database Entry</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
