"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import foodDB from "@/data/foods.json";
import { Search, ChevronRight, X, Repeat, Barcode, Plus, Camera, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";

// Clean Data Handling Structure
interface ParsedFood {
  name: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  unit: "grams" | "count" | "ml";
  calories_per_unit?: number;
  protein_per_unit?: number;
  calories_per_100ml?: number;
  protein_per_100ml?: number;
  isNewBarcode?: boolean;
}

function AddFoodContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFood = searchParams.get("food");

  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<ParsedFood | null>(null);
  const [quantity, setQuantity] = useState<number | "">("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const customFoods = useStore((s) => s.customFoods);
  const addCustomFood = useStore((s) => s.addCustomFood);
  const logs = useStore((s) => s.logs);
  const addFood = useStore((s) => s.addFood);

  const today = getToday();
  const recentEntries = logs[today]?.entries || [];
  const hiddenDefaultFoodNames = useStore((s) => s.hiddenDefaultFoodNames);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  const yesterdayEntries = logs[yesterdayStr]?.entries || [];

  const freqMap: Record<string, number> = {};
  Object.values(logs).forEach(day => {
    day.entries.forEach(e => {
      freqMap[e.name] = (freqMap[e.name] || 0) + 1;
    });
  });

  const catalogVisible = foodDB.filter(
    (f) => !hiddenDefaultFoodNames.includes(f.name.toLowerCase())
  );
  const mergedByName = new Map<string, (typeof foodDB)[number] | ParsedFood>();
  catalogVisible.forEach((f) => mergedByName.set(f.name.toLowerCase(), f));
  customFoods.forEach((f) => mergedByName.set(f.name.toLowerCase(), f as ParsedFood));
  const fullDB = Array.from(mergedByName.values()).sort((a, b) => {
    return (freqMap[b.name] || 0) - (freqMap[a.name] || 0);
  });

  useEffect(() => {
    if (initialFood) {
      const match = fullDB.find(f => f.name === initialFood);
      if (match) setSelectedFood(match as ParsedFood);
    }
  }, [initialFood]);

  const filteredFoods = search
    ? fullDB.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : fullDB;

  let liveCalories = 0;
  let liveProtein = 0;

  const validQuantity = quantity === "" ? 0 : Number(quantity);

  if (selectedFood) {
    if (selectedFood.unit === "count" && selectedFood.calories_per_unit !== undefined) {
      liveCalories = selectedFood.calories_per_unit * validQuantity;
      liveProtein = (selectedFood.protein_per_unit || 0) * validQuantity;
    } else if (selectedFood.unit === "ml" && selectedFood.calories_per_100ml !== undefined) {
      liveCalories = selectedFood.calories_per_100ml * (validQuantity / 100);
      liveProtein = (selectedFood.protein_per_100ml || 0) * (validQuantity / 100);
    } else {
      liveCalories = (selectedFood.calories_per_100g || 0) * (validQuantity / 100);
      liveProtein = (selectedFood.protein_per_100g || 0) * (validQuantity / 100);
    }
  }

  liveCalories = Math.round(liveCalories);
  liveProtein = Math.round(liveProtein * 10) / 10;

  const isUnrealistic =
    (selectedFood?.unit === "count" && validQuantity > 10) ||
    (selectedFood?.unit === "grams" && validQuantity > 1500) ||
    (selectedFood?.unit === "ml" && validQuantity > 1500) ||
    liveCalories > 2000;

  const handleAdd = () => {
    if (!selectedFood || validQuantity <= 0) return;
    addFood(today, {
      name: selectedFood.name,
      calories: liveCalories,
      protein: liveProtein,
    });
    toast.success(`Logged ${validQuantity}${selectedFood.unit === "count" ? " units" : selectedFood.unit === "ml" ? "ml" : "g"} ${selectedFood.name}`);
    setSelectedFood(null);
    setQuantity("");
    if (initialFood) router.replace("/add");
  };

  const handleBarcodeSearch = async (query: string) => {
    if (!query) return;
    setIsBarcodeLoading(true);
    setSearch("");

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${query}.json`);
      if (!res.ok) throw new Error("API Error");

      const data = await res.json();

      if (data.status === 1 && data.product) {
        const nut = data.product.nutriments || {};

        const resolvedName = data.product.product_name || `Scanned Item (${query})`;
        const kcals = Number(nut["energy-kcal_100g"]) || Number(nut["energy_100g"]) / 4.184 || 0;
        const proteins = Number(nut["proteins_100g"]) || 0;

        const newFood: ParsedFood = {
          name: resolvedName,
          unit: "grams",
          calories_per_100g: Math.round(kcals),
          protein_per_100g: Math.round(proteins * 10) / 10,
          isNewBarcode: true
        };

        setSelectedFood(newFood);
        setQuantity("");
        stopScanner();
      } else {
        toast.info("Product not found in database. Please enter manually.", { duration: 4000 });
        setSelectedFood({
          name: ``,
          unit: "grams",
          calories_per_100g: 0,
          protein_per_100g: 0,
          isNewBarcode: true
        });
        stopScanner();
      }
    } catch {
      toast.error("Network error. Try manual entry.");
      setSelectedFood({ name: ``, unit: "grams", calories_per_100g: 0, protein_per_100g: 0, isNewBarcode: true });
      stopScanner();
    } finally {
      setIsBarcodeLoading(false);
      setBarcodeQuery("");
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera not supported on this browser.");
      return;
    }

    setScannerActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      stream.getTracks().forEach(track => track.stop());

      if (!scannerRef.current) scannerRef.current = new Html5Qrcode("reader");

      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!isBarcodeLoading) {
            handleBarcodeSearch(decodedText);
          }
        },
        () => { /* Ignore noisy scan errors */ }
      );
    } catch (err: any) {
      console.error("Camera Error:", err);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setCameraError("Camera permission denied. Please allow in settings.");
      } else {
        setCameraError("Camera unavailable.");
      }
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(() => null);
    }
    setScannerActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    if (!isScanning) stopScanner();
    return () => { stopScanner(); };
  }, [isScanning]);

  return (
    <div className="p-6 h-full flex flex-col relative animate-in fade-in duration-500 pb-safe">
      <header className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Add Food</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/foods')}
              className="h-11 px-4 rounded-xl bg-surface/80 border border-white/5 flex items-center justify-center font-bold text-sm text-muted hover:text-foreground active:scale-95 transition-colors"
            >
              Food DB
            </button>
            <button onClick={() => setIsScanning(!isScanning)} className={`h-11 px-4 rounded-xl border flex items-center justify-center font-bold text-sm active:scale-95 transition-colors ${isScanning ? 'bg-primary border-primary text-background' : 'bg-surface/80 border-white/5 text-foreground'}`}>
              <Barcode className="w-4 h-4 mr-2" /> Scanner
            </button>
          </div>
        </div>

        {isScanning ? (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2">
            {!scannerActive ? (
              <div className="bg-surface border border-white/5 p-6 rounded-[24px] mb-4 flex flex-col items-center justify-center gap-4">
                {cameraError ? (
                  <div className="text-center flex flex-col items-center">
                    <p className="text-highlight text-sm font-semibold mb-4">{cameraError}</p>
                    <button onClick={startScanner} className="px-5 py-2.5 bg-primary rounded-xl text-background font-bold text-sm active:scale-95 transition-transform">Retry Camera</button>
                  </div>
                ) : (
                  <>
                    <button onClick={startScanner} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary group active:scale-95 transition-all">
                      <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                    <p className="text-sm text-muted font-medium">Tap to open Camera</p>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-white/5 p-2 rounded-[24px] mb-4 overflow-hidden relative shadow-lg">
                {isBarcodeLoading && (
                  <div className="absolute inset-0 bg-background/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-bold animate-pulse text-primary">Fetching product...</p>
                  </div>
                )}
                <div id="reader" className="w-full rounded-[18px] overflow-hidden aspect-square sm:aspect-video bg-black flex items-center justify-center" />
                <button onClick={stopScanner} className="absolute top-4 right-4 bg-background/80 backdrop-blur-md p-2 rounded-full text-foreground z-20 hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="flex gap-2 relative mt-4">
              <input
                type="text"
                placeholder="Lookup manually (e.g., 5449000000996)"
                value={barcodeQuery}
                onChange={e => setBarcodeQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch(barcodeQuery)}
                className="w-full bg-surface border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isBarcodeLoading}
              />
              <button
                disabled={isBarcodeLoading || !barcodeQuery}
                onClick={() => handleBarcodeSearch(barcodeQuery)}
                className="px-5 bg-primary text-background rounded-xl font-bold text-sm shrink-0 disabled:opacity-50 active:scale-95 transition-all"
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
              className="w-full bg-surface border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/50 shadow-inner"
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-24 space-y-2 no-scrollbar">
        {!search && !isScanning && (recentEntries.length > 0 || yesterdayEntries.length > 0) && (
          <div className="mb-6 space-y-3">
            <h3 className="text-xs font-bold text-muted tracking-wide uppercase px-1">Quick Actions</h3>
            {yesterdayEntries.length > 0 && (
              <button
                onClick={() => {
                  yesterdayEntries.forEach(entry => addFood(today, { name: entry.name, calories: entry.calories, protein: entry.protein }));
                  toast.success(`Repeated all ${yesterdayEntries.length} meals from yesterday!`);
                }}
                className="w-full flex items-center gap-3 p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl active:scale-[0.98] transition-transform"
              >
                <Repeat className="w-5 h-5" />
                <span className="font-semibold text-sm">Repeat Yesterday's Meals ({yesterdayEntries.length} items)</span>
              </button>
            )}
          </div>
        )}

        {!isScanning && (
          <>
            <div className="flex justify-between items-end mb-3 mt-4 px-1">
              <h3 className="text-xs font-bold text-muted tracking-wide uppercase">
                {search ? "Search Results" : "Food Database"}
              </h3>
              {search && filteredFoods.length === 0 && (
                <button
                  onClick={() => {
                    setSelectedFood({ name: search, unit: "grams", calories_per_100g: 0, protein_per_100g: 0 });
                    setQuantity("");
                  }}
                  className="text-xs text-primary font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" /> Custom Input
                </button>
              )}
            </div>

            {filteredFoods.map((food) => (
              <button
                key={"id" in food && (food as { id?: string }).id ? (food as { id?: string }).id : food.name}
                onClick={() => {
                  setSelectedFood(food as ParsedFood);
                  setQuantity("");
                }}
                className="w-full flex items-center justify-between p-4 bg-surface/50 border border-white/5 rounded-2xl active:bg-surface transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold text-sm">{food.name}</span>
                  <span className="text-xs text-muted font-medium">
                    {food.unit === "count"
                      ? `${food.calories_per_unit} kcal / ${food.protein_per_unit || 0}g`
                      : food.unit === "ml"
                        ? `${food.calories_per_100ml ?? 0} kcal / 100ml`
                        : `${food.calories_per_100g ?? 0} kcal / 100g`}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted opacity-50" />
              </button>
            ))}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedFood && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFood(null)}
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

              <div className="flex justify-between items-start mb-8">
                <div className="w-full pr-4">
                  {selectedFood.isNewBarcode || (selectedFood.name === "") ? (
                    <input
                      type="text"
                      autoFocus
                      required
                      value={selectedFood.name}
                      onChange={(e) => setSelectedFood({ ...selectedFood, name: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl py-3 px-4 text-xl font-black tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner placeholder:text-muted/50"
                      placeholder="Enter exact food name..."
                    />
                  ) : (
                    <h2 className="text-2xl font-black tracking-tight leading-tight">{selectedFood.name}</h2>
                  )}
                  <p className="text-muted text-sm mt-2 font-medium">
                    Specify amount in {selectedFood.unit === "count" ? "units" : selectedFood.unit === "ml" ? "ml" : "grams"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFood(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center p-1 shrink-0 mt-1 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {(selectedFood.isNewBarcode || (selectedFood.calories_per_100g === 0 && selectedFood.calories_per_unit === undefined && !selectedFood.name)) && (
                <div className="flex gap-3 mb-6 bg-background rounded-2xl p-1.5 shadow-inner">
                  <div className="flex-1 bg-surface border border-white/5 rounded-xl p-3 flex flex-col items-center">
                    <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Kcal per 100g</label>
                    <input type="number" min="0" value={selectedFood.calories_per_100g || ""} placeholder="0" className="w-full bg-transparent text-lg font-black text-center focus:outline-none placeholder:text-muted/30" onChange={e => setSelectedFood({ ...selectedFood, calories_per_100g: Number(e.target.value) })} />
                  </div>
                  <div className="flex-1 bg-surface border border-white/5 rounded-xl p-3 flex flex-col items-center">
                    <label className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Protein per 100g</label>
                    <input type="number" min="0" value={selectedFood.protein_per_100g || ""} placeholder="0" className="w-full bg-transparent text-lg font-black text-center focus:outline-none placeholder:text-muted/30" onChange={e => setSelectedFood({ ...selectedFood, protein_per_100g: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {/* Enhanced Quantity Logic */}
              {selectedFood.unit === "count" ? (
                <div className="flex items-center justify-center gap-6 mb-8 mt-2">
                  <button onClick={() => setQuantity(Math.max(1, (quantity === "" ? 1 : quantity) - 1))} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-muted active:scale-90 transition-all hover:bg-white/10 shrink-0 shadow-sm"><Minus className="w-6 h-6 stroke-[3]" /></button>
                  <div className="flex flex-col items-center justify-center min-w-[100px]">
                    <span className="text-5xl font-black text-foreground drop-shadow-sm">{quantity === "" ? "—" : quantity}</span>
                    <span className="text-muted text-sm font-bold tracking-wider uppercase mt-1">Units</span>
                  </div>
                  <button onClick={() => setQuantity((quantity === "" ? 0 : quantity) + 1)} className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-muted active:scale-90 transition-all hover:bg-white/10 shrink-0 shadow-sm"><Plus className="w-6 h-6 stroke-[3]" /></button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4 mb-8 relative">
                  <button onClick={() => setQuantity(Math.max(1, (quantity === "" ? 50 : quantity) - 50))} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted active:scale-90 transition-all hover:bg-white/10 shrink-0 shadow-sm"><Minus className="w-6 h-6 stroke-[3]" /></button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Amount"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-background border border-white/10 rounded-2xl py-4 flex-1 text-3xl font-black text-center focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner placeholder:text-muted/30"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-bold pointer-events-none">{selectedFood.unit === "ml" ? "ml" : "g"}</span>
                  </div>
                  <button onClick={() => setQuantity((quantity === "" ? 0 : quantity) + 50)} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted active:scale-90 transition-all hover:bg-white/10 shrink-0 shadow-sm"><Plus className="w-6 h-6 stroke-[3]" /></button>
                </div>
              )}

              {quantity === "" ? (
                <div className="text-center py-4 mb-4 text-muted text-sm font-medium">Enter quantity to see nutrition...</div>
              ) : (
                <>
                  {isUnrealistic && (
                    <div className="mx-auto max-w-sm mb-4 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold text-center mt-[-10px]">
                      ⚠️ This quantity seems unusually high.
                    </div>
                  )}
                  <div className="flex justify-around items-center bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-6">
                    <div className="text-center">
                      <p className="text-primary/80 text-[10px] font-bold uppercase tracking-widest mb-1">Calories</p>
                      <p className="text-3xl tracking-tight font-black text-foreground drop-shadow-md">{liveCalories}</p>
                    </div>
                    <div className="w-px h-10 bg-primary/20" />
                    <div className="text-center">
                      <p className="text-primary/80 text-[10px] font-bold uppercase tracking-widest mb-1">Protein</p>
                      <p className="text-3xl tracking-tight font-black text-foreground drop-shadow-md">{liveProtein}g</p>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={async () => {
                  if (!selectedFood.name || validQuantity <= 0) return;

                  let savedFood = null;

                  // ✅ SAVE TO DB FIRST
                  if (
                    selectedFood.isNewBarcode ||
                    selectedFood.calories_per_100g === 0 ||
                    selectedFood.calories_per_100ml === 0
                  ) {
                    const { data: { user } } = await supabase.auth.getUser();

                    if (!user) {
                      toast.error("User not authenticated");
                      return;
                    }

                    const newFood = {
                      name: selectedFood.name || "Custom Food",
                      unit: selectedFood.unit,
                      calories_per_100g: selectedFood.calories_per_100g || null,
                      protein_per_100g: selectedFood.protein_per_100g || null,
                      calories_per_unit: selectedFood.calories_per_unit || null,
                      protein_per_unit: selectedFood.protein_per_unit || null,
                      calories_per_100ml: selectedFood.calories_per_100ml || null,
                      protein_per_100ml: selectedFood.protein_per_100ml || null,
                      user_id: user.id,
                    };

                    const { data, error } = await supabase
                      .from("foods")
                      .insert(newFood)
                      .select()
                      .single();

                    if (error) {
                      console.error("Food save error:", error.message);
                      toast.error("Failed to save food");
                      return;
                    }

                    savedFood = data;

                    // ✅ UPDATE STORE AFTER DB SUCCESS
                    addCustomFood(savedFood);
                  }

                  // ✅ LOG FOOD (this was already correct)
                  handleAdd();
                }}
                disabled={validQuantity <= 0 || !selectedFood.name}
                className="w-full py-4 rounded-2xl bg-primary text-background font-black tracking-wide text-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
              >
                Add to Diary
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
