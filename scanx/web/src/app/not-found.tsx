import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-lg">
      <EmptyState title="404 — nothing on-chain here">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          Back to scanner
        </Link>
      </EmptyState>
    </Card>
  );
}
