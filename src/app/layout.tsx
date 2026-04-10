import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "sonner";
import { NotificationManager } from "@/components/NotificationManager";
import AuthWrapper from "@/components/AuthWrapper";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gainly",
  description: "Simple Weight Gain & Fitness Tracker",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground h-[100dvh] overflow-hidden`}>
        <SplashScreen />
        <NotificationManager />
        <div className="mx-auto flex flex-col h-[100dvh] max-w-md border-x border-white/5 bg-background shadow-2xl relative shadow-primary/5">
          <AuthWrapper>
            {/* Main Scrollable Area */}
            <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative z-10">
              {children}
            </main>
            <BottomNav />
          </AuthWrapper>
          <Toaster theme="dark" toastOptions={{ className: 'bg-surface border-white/10 text-foreground' }} position="top-center" />
        </div>
      </body>
    </html>
  );
}
