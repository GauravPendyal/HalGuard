import type { Metadata } from "next";
import { ChatWorkspace } from "@/features/chatui/ChatWorkspace";

export const metadata: Metadata = {
  title: "Verify a claim · HalluciGuard",
  description:
    "Generate an answer and run it through an evidence pipeline. See the verdict, the sources, and the model reasoning behind every claim.",
};

export default function VerifyPage() {
  return <ChatWorkspace />;
}
