"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { FoodEntryDB, useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import foodDB from "@/data/foods.json";
import { Search, ChevronRight, X, Clock, Repeat, Barcode, Plus, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

function AddFoodContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFood = searchParams.get("food");

  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const { logs, addFood, customFoods, addCustomFood } = useStore();
  const today = getToday();
  const recentEntries = logs[today]?.entries || [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdayEntries = logs[yesterdayStr]?.entries || [];

  // Compute frequencies for sorting
  const freqMap: Record<string, number> = {};
  Object.values(logs).forEach(day => {
    day.entries.forEach(e => {
      freqMap[e.name] = (freqMap[e.name] || 0) + 1;
    });
  });

  const uniqueRecentNames = Array.from(new Set(recentEntries.map((e) => e.name))).reverse().slice(0, 3);
  const fullDB = [...foodDB, ...customFoods].sort((a, b) => {
    return (freqMap[b.name] || 0) - (freqMap[a.name] || 0);
  });

  useEffect(() => {
    if (initialFood) {
      const match = fullDB.find(f => f.name === initialFood);
      if (match) setSelectedFood(match);
    }
  }, [initialFood]);

  const filteredFoods = search
    ? fullDB.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : fullDB;

  const qtyNum = Math.max(0, Number(quantity) || 0);
  let liveCalories = 0;
  let liveProtein = 0;

  if (selectedFood) {
    if (selectedFood.unit === "count") {
      liveCalories = (selectedFood.calories_per_unit || 0) * qtyNum;
      liveProtein = (selectedFood.protein_per_unit || 0) * qtyNum;
    } else {
      liveCalories = (selectedFood.calories_per_100g || 0) * (qtyNum / 100);
      liveProtein = (selectedFood.protein_per_100g || 0) * (qtyNum / 100);
    }
  }

  liveCalories = Math.round(liveCalories);
  liveProtein = Math.round(liveProtein * 10) / 10;

  const handleAdd = () => {
    if (!selectedFood || qtyNum <= 0) return;
    addFood(today, {
      name: selectedFood.name,
      calories: liveCalories,
      protein: liveProtein,
    });
    toast.success(`Logged ${qtyNum}${selectedFood.unit === "count" ? "x" : "g"} ${selectedFood.name}`);
    setSelectedFood(null);
    setQuantity("");
    if (initialFood) router.replace("/add");
  };

  const handleBarcodeSearch = async (query: string) => {
    if (!query) return;
    setIsBarcodeLoading(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${query}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const nut = data.product.nutriments || {};
        const newFood: any = {
          name: data.product.product_name || `Barcode ${query}`,
          unit: "grams",
          calories_per_100g: nut["energy-kcal_100g"] || 0,
          protein_per_100g: nut["proteins_100g"] || 0,
          isNewBarcode: true
        };
        setSelectedFood(newFood);
        toast.success("Barcode found! Edit details if needed.");
        stopScanner();
      } else {
        toast.error("Data not found. Please enter manually.");
        setSelectedFood({ name: `Barcode ${query}`, unit: "grams", calories_per_100g: 0, protein_per_100g: 0, isNewBarcode: true });
        stopScanner();
      }
    } catch {
      toast.error("Network error. Try manual entry.");
      setSelectedFood({ name: `Barcode ${query}`, unit: "grams", calories_per_100g: 0, protein_per_100g: 0, isNewBarcode: true });
      stopScanner();
    } finally {
      setIsBarcodeLoading(false);
      setBarcodeQuery("");
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
       setCameraError("Camera not supported (HTTPS required).");
       return;
    }
    
    setScannerActive(true);
    try {
      // Explicitly request permission first to catch errors like permission denied cleanly
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Stop stream immediately as Html5Qrcode handles its own stream
      stream.getTracks().forEach(track => track.stop());

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!isBarcodeLoading) {
            handleBarcodeSearch(decodedText);
          }
        },
        () => {
          // Ignore scanning errors (noisy)
        }
      );
    } catch (err: any) {
      console.error("Camera Error:", err);
      // Detailed error states
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Camera unavailable. " + (err.message || "Unknown error."));
      }
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setScannerActive(false);
    setCameraError(null);
  };

  // Ensure scanner stops if we leave scanning mode
  useEffect(() => {
    if (!isScanning) {
      stopScanner();
    }
  }, [isScanning]);

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 pb-safe">
      <header className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Add Food</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/foods')} className="h-10 px-3 rounded-xl bg-surface/50 border border-white/5 flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-muted active:scale-95">
              Food DB
            </button>
            <button onClick={() => setIsScanning(!isScanning)} className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 transition-colors ${isScanning ? 'bg-primary border-primary text-background' : 'bg-surface/50 border-white/5 text-muted'}`}>
              <Barcode className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isScanning ? (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2">
            {!scannerActive ? (
              <div className="bg-surface border border-white/5 p-4 rounded-3xl mb-3 flex flex-col items-center justify-center gap-3">
                {cameraError ? (
                   <div className="text-center">
                      <p className="text-red-400 text-xs font-bold mb-3">{cameraError}</p>
                      <button onClick={startScanner} className="px-4 py-2 bg-white/10 rounded-xl text-xs font-bold active:scale-95">Retry Camera</button>
                   </div>
                ) : (
                  <>
                    <button onClick={startScanner} className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 active:scale-95 transition-colors">
                      <Camera className="w-7 h-7" />
                    </button>
                    <p className="text-xs uppercase text-muted font-bold tracking-wider">Tap to open Camera</p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-white/5 p-2 rounded-3xl mb-3 overflow-hidden relative">
                {isBarcodeLoading && (
                   <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                   </div>
                )}
                <div id="reader" className="w-full rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center" />
                <button onClick={stopScanner} className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white z-20">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Enter barcode numbers manually..."
                value={barcodeQuery}
                onChange={e => setBarcodeQuery(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isBarcodeLoading}
              />
              <button 
                disabled={isBarcodeLoading}
                onClick={() => handleBarcodeSearch(barcodeQuery)} 
                className="px-4 bg-primary text-background rounded-xl font-bold text-sm shrink-0 disabled:opacity-50"
              >
                {isBarcodeLoading ? '...' : 'Search'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Search foods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/50"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-24 space-y-2 no-scrollbar">
        {!search && (recentEntries.length > 0 || yesterdayEntries.length > 0) && (
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-semibold text-muted tracking-widest uppercase">Shortcuts</h3>
            {yesterdayEntries.length > 0 && (
              <button
                onClick={() => {
                  yesterdayEntries.forEach(entry => addFood(today, { name: entry.name, calories: entry.calories, protein: entry.protein }));
                  toast.success(`Repeated all ${yesterdayEntries.length} meals from yesterday!`);
                }}
                className="w-full flex items-center gap-3 p-4 bg-highlight/10 text-highlight border border-highlight/20 rounded-2xl active:scale-[0.98] transition-transform"
              >
                <Repeat className="w-5 h-5" />
                <span className="font-semibold text-sm">Repeat Yesterday's Meals ({yesterdayEntries.length} items)</span>
              </button>
            )}
          </div>
        )}

        <div className="flex justify-between items-end mb-2 mt-4">
          <h3 className="text-xs font-semibold text-muted tracking-widest uppercase">
            {search ? "Results" : "Database"}
          </h3>
          {search && filteredFoods.length === 0 && (
            <button
              onClick={() => {
                setSelectedFood({ name: search, unit: "grams", calories_per_100g: 0, protein_per_100g: 0 });
              }}
              className="text-xs text-primary font-bold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Custom Input
            </button>
          )}
        </div>

        {filteredFoods.map((food) => (
          <button
            key={food.name}
            onClick={() => setSelectedFood(food)}
            className="w-full flex items-center justify-between p-4 bg-surface/50 border border-white/5 rounded-2xl active:bg-surface transition-colors"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold text-sm">{food.name}</span>
              <span className="text-xs text-muted">
                {food.unit === "count"
                  ? `${food.calories_per_unit} kcal / ${food.protein_per_unit || 0}g`
                  : `${food.calories_per_100g} kcal / 100g`}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedFood && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFood(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-surface border-t border-white/10 p-6 rounded-t-[32px] z-50 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-start mb-6">
                <div className="w-full mr-4">
                  {selectedFood.isNewBarcode || (selectedFood.calories_per_100g === 0 && selectedFood.calories_per_unit === undefined) ? (
                    <div className="mb-2">
                       <label className="text-xs text-muted uppercase font-bold tracking-wider mb-1 block">Food Name</label>
                       <input
                         type="text"
                         value={selectedFood.name}
                         onChange={(e) => setSelectedFood({ ...selectedFood, name: e.target.value })}
                         className="w-full bg-background border border-white/10 rounded-xl py-2 px-3 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                         placeholder="Enter food name"
                       />
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold">{selectedFood.name}</h2>
                  )}
                  <p className="text-muted text-sm mt-1">
                    Enter quantity in {selectedFood.unit === "count" ? "units" : "grams"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFood(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center p-1 shrink-0 mt-1"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* Edit Calories and Protein for barcode/custom */}
              {(selectedFood.isNewBarcode || (selectedFood.calories_per_100g === 0 && selectedFood.calories_per_unit === undefined)) && (
                <div className="flex gap-2 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="w-1/2">
                    <label className="text-xs text-muted font-bold block mb-1 text-center">Kcal / 100g</label>
                    <input type="number" value={selectedFood.calories_per_100g || ""} placeholder="Kcal" className="w-full bg-background border border-white/10 py-2 px-3 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setSelectedFood({ ...selectedFood, calories_per_100g: Number(e.target.value) })} />
                  </div>
                  <div className="w-1/2">
                    <label className="text-xs text-muted font-bold block mb-1 text-center">Protein / 100g</label>
                    <input type="number" value={selectedFood.protein_per_100g || ""} placeholder="Protein" className="w-full bg-background border border-white/10 py-2 px-3 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50" onChange={e => setSelectedFood({ ...selectedFood, protein_per_100g: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              <div className="relative mb-6">
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-2xl py-5 px-6 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-muted font-medium">
                  {selectedFood.unit === "count" ? "x" : "g"}
                </div>
              </div>

              <div className="flex justify-around items-center bg-white/5 rounded-2xl p-4 mb-6">
                <div className="text-center">
                  <p className="text-muted text-xs uppercase tracking-wider">Calories</p>
                  <p className="text-xl tracking-tight font-black text-foreground">{liveCalories} <span className="text-sm font-normal text-muted">kcal</span></p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-muted text-xs uppercase tracking-wider">Protein</p>
                  <p className="text-xl tracking-tight font-black text-foreground">{liveProtein} <span className="text-sm font-normal text-muted">g</span></p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedFood.isNewBarcode || (selectedFood.calories_per_100g === 0 && selectedFood.protein_per_100g > 0)) {
                    // Extract only the necessary fields to store in custom foods
                    const foodToSave = {
                       name: selectedFood.name,
                       unit: selectedFood.unit,
                       calories_per_100g: selectedFood.calories_per_100g,
                       protein_per_100g: selectedFood.protein_per_100g,
                       calories_per_unit: selectedFood.calories_per_unit,
                       protein_per_unit: selectedFood.protein_per_unit
                    };
                    addCustomFood(foodToSave);
                  }
                  handleAdd();
                }}
                disabled={qtyNum <= 0}
                className="w-full py-4 rounded-2xl bg-primary text-background font-bold text-lg active:scale-95 transition-all disabled:opacity-50"
              >
                Log Food
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AddFood() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AddFoodContent />
    </Suspense>
  );
}
