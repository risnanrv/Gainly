"use client";

import { useStore } from "@/store/useStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { auth } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Protect routes
    if (!auth.isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    } else if (auth.isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [mounted, auth.isAuthenticated, pathname, router]);

  if (!mounted) return null; // Prevent hydration mismatch

  // Render children only if auth condition is met or transitioning
  if (!auth.isAuthenticated && pathname !== "/login") return null;

  return <>{children}</>;
}
