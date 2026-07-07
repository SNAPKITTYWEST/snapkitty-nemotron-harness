export interface HarnessReceipt {
  timestamp: string;
  model: string;
  input_sha256: string;
  output_sha256: string;
  syscalls: string[];
  status: "ACCEPTED" | "REJECTED";
  prolog_validated: boolean;
}

export async function sha256(x: string): Promise<string> {
  const data = new TextEncoder().encode(x);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function downloadReceipt(receipt: HarnessReceipt) {
  const json = JSON.stringify(receipt, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyReceipt(receipt: HarnessReceipt): Promise<void> {
  return navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
}
