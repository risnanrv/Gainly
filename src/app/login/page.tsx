"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const [step, setStep] = useState<"login" | "check_email" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateAuth, updateProfile } = useStore();

  useEffect(() => {
    if (searchParams.get("setup") === "true") {
      setStep("signup");
    }
  }, [searchParams]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://gainly-seven.vercel.app/auth/callback",
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to login");
      setStep("check_email");
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Auth session lost. Please login again.");
      setStep("login");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          name,
          age: age ? Number(age) : null,
          gender: gender || null,
          height: height ? Number(height) : null,
          startingWeight: weight ? Number(weight) : null,
          currentWeight: weight ? Number(weight) : null,
        }
      ]);

    if (error) {
      toast.error("Failed to create profile...");
      setLoading(false);
      return;
    }

    updateAuth({ isAuthenticated: true, email: user.email, name, age: age ? Number(age) : undefined });
    if (weight) {
      updateProfile({ startingWeight: Number(weight), currentWeight: Number(weight) });
    }

    toast.success("Account created successfully!");
    router.push("/");
  };

  const loginWithGoogle = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://gainly-seven.vercel.app/auth/callback",
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-highlight/10 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence mode="wait">
        {step === "login" && (
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

            <h1 className="text-4xl font-black tracking-tighter mb-2 text-center">Gainly</h1>
            <p className="text-muted text-center mb-10 text-sm">
              Simple weight gain & fitness tracker.
            </p>

            <form onSubmit={handleSendMagicLink} className="w-full space-y-4">
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted/60"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-foreground text-background font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Sending link..." : "Continue with Email"}
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
          </motion.div>
        )}

        {step === "check_email" && (
          <motion.div
            key="check_email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-sm flex flex-col items-center z-10"
          >
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-2 text-center">Check your email</h2>
            <p className="text-sm text-muted text-center leading-relaxed">
              We sent a magic login link to <strong className="text-foreground">{email}</strong>.<br />Click the link to sign in automatically.
            </p>
            <button
              onClick={() => setStep("login")}
              className="mt-8 text-sm text-muted font-bold active:scale-95 transition-transform"
            >
              Use a different email
            </button>
          </motion.div>
        )}

        {step === "signup" && (
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
                  type="text"
                  placeholder="Gender (Optional)"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-surface/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Height cm (Optional)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
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
                {loading ? "Creating profile..." : "Complete Setup"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
