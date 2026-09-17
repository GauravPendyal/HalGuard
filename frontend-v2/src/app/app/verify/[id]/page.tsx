import type { Metadata } from "next";
import { VerifyWorkspace } from "@/components/verify/VerifyWorkspace";

export const metadata: Metadata = {
  title: "Verification Detail · HalluciGuard",
  description: "View past verification evidence and verdict.",
};

export default async function VerifyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VerifyWorkspace initialId={id} />;
}
