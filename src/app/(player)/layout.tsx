"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import PlayerLayout from "@/components/layout/PlayerLayout";

const Spinner = () => (
  <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
  </div>
);

function normPath(p: string) {
  return p.replace(/\/+$/, "") || "/";
}

export default function PlayerGroupLayout({ children }: { children: React.ReactNode }) {
  const rawPath = usePathname();
  const pathname = normPath(rawPath);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait for client mount first to avoid hydration mismatch (React #418)
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const done = () => setReady(true);
    const t = setTimeout(done, 800);
    try {
      if (useAuthStore.persist.hasHydrated()) {
        clearTimeout(t); done(); return;
      }
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        clearTimeout(t); done();
      });
      return () => { clearTimeout(t); unsub(); };
    } catch {
      // localStorage not available yet — timeout fires
    }
    return () => clearTimeout(t);
  }, [mounted]);

  // Login-Seite: immer direkt rendern (kein PlayerLayout)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // SSR / not yet mounted → same spinner as server render
  if (!mounted || !ready) return <Spinner />;

  // Nicht eingeloggt → hard redirect zur Login-Seite
  if (!isLoggedIn) {
    window.location.replace("/login/");
    return <Spinner />;
  }

  return <PlayerLayout>{children}</PlayerLayout>;
}
