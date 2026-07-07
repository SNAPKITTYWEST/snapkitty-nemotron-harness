import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface HarnessReceipt {
  timestamp: string;
  model: string;
  input_sha256: string;
  output_sha256: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  prolog_validated: boolean;
}

export function sha256(x: string): string {
  return createHash("sha256").update(x).digest("hex");
}

export function writeReceipt(receipt: HarnessReceipt): string {
  const dir = process.env.RECEIPT_DIR ?? "./receipts";
  mkdirSync(dir, { recursive: true });

  const id = sha256(JSON.stringify(receipt)).slice(0, 16);
  const path = join(dir, `${id}.json`);

  writeFileSync(path, JSON.stringify(receipt, null, 2));
  return path;
}
