"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import MarketingHome from "@/components/marketing/MarketingHome";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/lib/auth/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const openWorkspace = useCallback(() => {
    if (status === "authenticated") router.push("/app");
    else setAuthOpen(true);
  }, [router, status]);

  return (
    <>
      <MarketingHome onOpenAuth={openWorkspace} authenticated={status === "authenticated"} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
