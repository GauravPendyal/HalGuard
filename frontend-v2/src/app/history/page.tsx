import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = {
  title: "History · HalluciGuard",
  description: "Your authenticated HalluciGuard verification history.",
};

export default function HistoryPage() {
  return <HistoryView />;
}
