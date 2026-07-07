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

export async function sha256(msg: string): Promise<string> {
  const data = new TextEncoder().encode(msg);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
