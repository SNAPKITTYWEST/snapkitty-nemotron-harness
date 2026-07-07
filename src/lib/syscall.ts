export type SnapSyscall =
  | "lean_gate" | "prolog_gate" | "emojicode_persona"
  | "tavily_search" | "google_search" | "curl_fetch" | "bash_exec"
  | "file_read" | "file_write" | "build_check" | "receipt_seal"
  | "reject_untrusted" | "kernel_verify" | "ere_check"
  | "worm_seal_required" | "build_receipt" | "reject_unsealed" | "executor_mode";

const TOKENS: Record<string, SnapSyscall> = {
  "<|lean_gate|>": "lean_gate",
  "<|prolog_gate|>": "prolog_gate",
  "<|emojicode_persona|>": "emojicode_persona",
  "<|tavily_search|>": "tavily_search",
  "<|google_search|>": "google_search",
  "<|curl_fetch|>": "curl_fetch",
  "<|bash_exec|>": "bash_exec",
  "<|file_read|>": "file_read",
  "<|file_write|>": "file_write",
  "<|build_check|>": "build_check",
  "<|receipt_seal|>": "receipt_seal",
  "<|reject_untrusted|>": "reject_untrusted",
  "<|kernel_verify|>": "kernel_verify",
  "<|ere_check|>": "ere_check",
  "<|worm_seal_required|>": "worm_seal_required",
  "<|build_receipt|>": "build_receipt",
  "<|reject_unsealed|>": "reject_unsealed",
  "<|executor_mode|>": "executor_mode",
};

export function extractSyscalls(text: string): SnapSyscall[] {
  return Object.entries(TOKENS)
    .filter(([t]) => text.includes(t))
    .map(([, s]) => s);
}
