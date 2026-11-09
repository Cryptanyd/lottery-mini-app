import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy" };

const UPDATED = "2026-11-09";

/** Public privacy policy — linked from the Chrome Web Store listing. */
export default function PrivacyPage() {
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">{APP_NAME} privacy policy</h1>
      <p className="hud-label mt-2">Last updated {UPDATED}</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-foreground">
        <section>
          <h2>Browser extension</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              The extension reads the text of pages on x.com and twitter.com <b>locally in your browser</b>, only to
              find Solana contract addresses. Page content is never sent to us or anyone else.
            </li>
            <li>
              When you click a scan button, a new tab opens on this website with that contract address in the URL.
              Nothing else is transmitted.
            </li>
            <li>
              Settings are stored with <code>chrome.storage.sync</code>. The optional list of addresses you opened is
              stored in <code>chrome.storage.local</code> on your device only; you can turn it off and clear it in the
              popup.
            </li>
            <li>The only permission requested is <code>storage</code>. No analytics, no tracking, no remote code.</li>
          </ul>
        </section>

        <section>
          <h2>Website</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Your watchlist, tracked wallets and scan history are stored in your browser&apos;s local storage, not on
              our servers.
            </li>
            <li>
              To build a report we query public blockchain data (Solana RPC) and public market APIs (DexScreener,
              Jupiter) for the address you requested.
            </li>
            <li>
              Connecting a wallet only shares your public address with the page. We never ask for or receive private
              keys or seed phrases.
            </li>
            <li>
              Pro payments are regular on-chain Solana transfers; we verify the public transaction and issue a license
              tied to your public wallet address.
            </li>
            <li>Our hosting provider may keep standard server logs (IP address, timestamps) for security and abuse prevention.</li>
          </ul>
        </section>

        <section>
          <h2>We do not</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>sell or share personal data;</li>
            <li>use data for advertising or credit decisions;</li>
            <li>collect browsing history, personal communications or authentication data.</li>
          </ul>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions or deletion requests: open an issue in the project repository or contact us via the site.</p>
        </section>
      </div>
    </Card>
  );
}
