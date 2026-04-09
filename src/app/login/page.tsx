"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

export default function Login() {
  const [step, setStep] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { updateAuth, updateProfile } = useStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Mock check for existing user - assuming new if they type "new@..." for demo purposes
    if (email.startsWith("new")) {
       setStep("signup");
       return;
    }
    
    setLoading(true);
    setTimeout(() => {
      updateAuth({ isAuthenticated: true, email });
      toast.success("Welcome back!");
      router.push("/");
    }, 1000);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      updateAuth({ 
        isAuthenticated: true, 
        email, 
        name, 
        age: age ? Number(age) : undefined 
      });
      
      if (weight) {
         updateProfile({ startingWeight: Number(weight), currentWeight: Number(weight) });
      }
      
      toast.success("Account created successfully!");
      router.push("/");
    }, 1000);
  };

  const loginWithGoogle = () => {
    setLoading(true);
    setTimeout(() => {
      updateAuth({ isAuthenticated: true, name: "Google User" });
      toast.success("Authenticated with Google");
      router.push("/");
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-highlight/10 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm flex flex-col items-center z-10"
          >
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-2xl shadow-primary/30 mb-8 border border-white/20">
              <img src="/icon-192x192.png" alt="Gainly Logo" className="w-full h-full object-cover" />
            </div>
            
            <h1 className="text-4xl font-black tracking-tighter mb-2 text-center">
              Gainly
            </h1>
            <p className="text-muted text-center mb-10 text-sm">
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
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-surface/50 border border-white/10 text-foreground font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-3 backdrop-blur-md hover:bg-surface disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <p className="mt-6 text-xs text-muted text-center cursor-pointer" onClick={() => setStep("signup")}>Don't have an account? <strong className="text-foreground">Sign Up</strong></p>
          </motion.div>
        ) : (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm flex flex-col items-center z-10"
          >
             <h2 className="text-3xl font-black mb-2 self-start">Almost there</h2>
             <p className="text-sm text-muted mb-8 self-start">Let's set up your fitness profile.</p>

             <form onSubmit={handleSignup} className="w-full space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted/60"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Age (Optional)"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-surface/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted/60"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Weight (kg)"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-surface/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted/60"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-4 rounded-2xl bg-primary text-background font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Complete Setup"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("login")}
                  className="w-full py-4 rounded-2xl text-muted font-bold text-sm active:scale-95 transition-all"
                >
                  Back to Login
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
