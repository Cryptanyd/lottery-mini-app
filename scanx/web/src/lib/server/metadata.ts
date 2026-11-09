import { PublicKey } from "@solana/web3.js";
import { fetchJson } from "./http";
import { rpc } from "./rpc";

const METAPLEX_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export interface OnchainMetadata {
  name: string | null;
  symbol: string | null;
  uri: string | null;
}

function readString(buf: Buffer, offset: number): [string, number] {
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const str = buf
    .subarray(start, start + len)
    .toString("utf8")
    .replace(/\0/g, "")
    .trim();
  return [str, start + len];
}

/** Parse the Metaplex Token Metadata account (classic SPL tokens, pump.fun etc). */
export async function metaplexMetadata(mint: string): Promise<OnchainMetadata | null> {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METAPLEX_PROGRAM.toBuffer(), new PublicKey(mint).toBuffer()],
    METAPLEX_PROGRAM,
  );
  const res = await rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
    pda.toBase58(),
    { encoding: "base64" },
  ]);
  if (!res.value) return null;
  const buf = Buffer.from(res.value.data[0], "base64");
  // key (1) + update authority (32) + mint (32)
  let o = 1 + 32 + 32;
  const [name, o1] = readString(buf, o);
  o = o1;
  const [symbol, o2] = readString(buf, o);
  o = o2;
  const [uri] = readString(buf, o);
  return { name: name || null, symbol: symbol || null, uri: uri || null };
}

/** Fetch the off-chain JSON pointed to by a metadata URI to get the image. */
export async function metadataImage(uri: string | null): Promise<string | null> {
  if (!uri || !/^https?:\/\//.test(uri)) return null;
  try {
    const json = await fetchJson<{ image?: string }>(uri, { timeoutMs: 3500 });
    return typeof json.image === "string" && /^https?:\/\//.test(json.image) ? json.image : null;
  } catch {
    return null;
  }
}
