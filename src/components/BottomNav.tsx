"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/add", icon: PlusCircle, label: "Add" },
    { href: "/progress", icon: TrendingUp, label: "Progress" },
    { href: "/expenses", icon: Wallet, label: "Expenses" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="absolute bottom-0 w-full bg-surface/80 backdrop-blur-md border-t border-white/5 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted hover:text-white/80"
              )}
            >
              <Icon size={24} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
