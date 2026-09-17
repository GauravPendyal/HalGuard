"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAuth();
  
  // Route protection
  useEffect(() => {
    if (pathname.startsWith("/app") && status === "anonymous") {
      router.replace("/");
    }
  }, [pathname, status, router]);

  // Don't show sidebar on how-it-works page to keep it clean
  if (pathname === "/how-it-works") {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Hide the AppShell layout (Sidebar) entirely on the public landing page 
  // since the user wants a clean, standalone sign-in screen.
  if (pathname === "/") {
    return (
      <main className="flex min-h-dvh flex-col bg-background">
        {children}
      </main>
    );
  }

  // Wait for auth to settle before rendering the protected shell
  if (status === "loading" || status === "anonymous") {
    return <div className="flex h-screen w-full bg-background" />;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-text-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        {children}
      </main>
    </div>
  );
}
