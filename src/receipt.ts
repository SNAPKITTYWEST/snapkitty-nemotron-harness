import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type ReceiptEntry = {
  kind: string;
  trust_deed: string;
  trust_deed_version: string;
  status: string;
  raw_output: string;
  syscalls: string[];
  gate: unknown[];
  timestamp: string;
  receipt_id: string;
};

export function writeReceipt(
  entry: Omit<ReceiptEntry, "timestamp" | "receipt_id">,
  options: { dir?: string } = {}
): ReceiptEntry {
  const receiptsDir = resolve(options.dir ?? "receipts");
  if (!existsSync(receiptsDir)) mkdirSync(receiptsDir, { recursive: true });

  const ts = new Date().toISOString();
  const receiptId = createHash("sha256")
    .update(JSON.stringify(entry) + ts)
    .digest("hex")
    .slice(0, 16);

  const receipt: ReceiptEntry = { ...entry, timestamp: ts, receipt_id: receiptId };

  const filename = join(receiptsDir, `${receiptId}.json`);
  writeFileSync(filename, JSON.stringify(receipt, null, 2));

  return receipt;
}
