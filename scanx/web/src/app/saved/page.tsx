import type { Metadata } from "next";
import { SavedClient } from "@/components/saved-client";

export const metadata: Metadata = { title: "Saved & history" };

export default function SavedPage() {
  return <SavedClient />;
}
