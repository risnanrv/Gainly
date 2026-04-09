"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth for demo, then redirect
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-highlight/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-sm flex flex-col items-center z-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-highlight flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 border border-white/20">
          <ArrowUpRight className="text-background w-10 h-10 stroke-[3]" />
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter mb-2 text-center">
          Gainly
        </h1>
        <p className="text-muted text-center mb-10">
          Simple weight gain & fitness tracker.
          <br />Consistency over complexity.
        </p>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-foreground text-background font-bold text-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Authenticating..." : "Continue with Email"}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-muted uppercase tracking-wider">Or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <button
          type="button"
          onClick={() => {
             setLoading(true);
             setTimeout(() => router.push("/"), 800);
          }}
          className="w-full py-4 rounded-2xl bg-surface/50 border border-white/10 text-foreground font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-3 backdrop-blur-md hover:bg-surface"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}
