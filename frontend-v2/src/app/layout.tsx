import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "HalluciGuard — Trace the evidence",
  description:
    "HalluciGuard traces AI-generated claims to their supporting evidence.",
};

export const viewport: Viewport = {
  themeColor: "#edf4ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
