export interface HarnessReceipt {
  id: string;
  timestamp: string;
  model: string;
  input_sha256: string;
  output_sha256: string;
  syscalls: string[];
  toolResults: Record<string, any>;
  status: "ACCEPTED" | "REJECTED";
}

export async function sha256(x: string): Promise<string> {
  const data = new TextEncoder().encode(x);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}
