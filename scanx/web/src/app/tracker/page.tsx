import { Suspense } from "react";
import type { Metadata } from "next";
import { TrackerClient } from "@/components/wallet/tracker-client";

export const metadata: Metadata = { title: "Wallet tracker" };

export default function TrackerPage() {
  return (
    <Suspense>
      <TrackerClient />
    </Suspense>
  );
}
