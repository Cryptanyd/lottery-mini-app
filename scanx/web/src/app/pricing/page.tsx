import type { Metadata } from "next";
import { PricingClient } from "@/components/pricing-client";

export const metadata: Metadata = { title: "ScanX Pro" };

export default function PricingPage() {
  return <PricingClient />;
}
