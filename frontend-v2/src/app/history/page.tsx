import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = {
  title: "History · HalluciGuard",
  description: "Your past verifications, stored locally in this browser.",
};

export default function HistoryPage() {
  return <HistoryView />;
}
