"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { getToday } from "@/lib/dateUtils";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import foodDB from "@/data/foods.json";
import { motion } from "framer-motion";

export function QuickAddCard({ foodName }: { foodName: string }) {
  const router = useRouter();
  const addFood = useStore((state) => state.addFood);
  const foodItem = foodDB.find((f) => f.name === foodName);

  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  if (!foodItem) return null;

  const handleTap = () => {
    if (typeof window !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    router.push(`/add?food=${encodeURIComponent(foodItem.name)}`);
  };

  return (
    <motion.button
      onClick={handleTap}
      whileTap={{ scale: 0.95 }}
      className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 w-[100px] flex-shrink-0 relative overflow-hidden group select-none touch-manipulation"
      style={{ WebkitUserSelect: "none" }}
    >
      <div className="absolute inset-0 bg-primary/0 group-active:bg-primary/10 transition-colors" />
      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-white/5">
        <Plus className="text-primary w-5 h-5 pointer-events-none" />
      </div>
      <span className="text-sm font-medium pointer-events-none">{foodItem.name}</span>
      <span className="text-[10px] text-muted pointer-events-none">
        {foodItem.unit === "count" ? "1 unit" : "100g"}
      </span>
    </motion.button>
  );
}
