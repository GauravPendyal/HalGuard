import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./marketing.css";
import { AppShell } from "@/components/shell/AppShell";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HalluciGuard — See how a claim becomes verified",
    template: "%s · HalluciGuard",
  },
  description:
    "HalluciGuard verifies AI answers against real evidence. Watch each claim travel from generation through retrieval, reranking, and entailment to a grounded verdict — with every source shown.",
  applicationName: "HalluciGuard",
  keywords: [
    "hallucination detection",
    "fact verification",
    "evidence grounding",
    "LLM verification",
    "AI trust",
  ],
  openGraph: {
    title: "HalluciGuard — evidence-grounded verification",
    description:
      "Watch a claim become an evidence-grounded verdict. Real sources, observable model execution, no hidden reasoning.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f8faf8",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable}`}
    >
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
