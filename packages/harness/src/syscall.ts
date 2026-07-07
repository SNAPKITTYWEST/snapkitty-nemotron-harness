export type SnapSyscall =
  | "kernel_verify"
  | "ere_check"
  | "worm_seal_required"
  | "build_receipt"
  | "reject_unsealed"
  | "executor_mode";

const TOKEN_MAP: Record<string, SnapSyscall> = {
  "<|kernel_verify|>": "kernel_verify",
  "<|ere_check|>": "ere_check",
  "<|worm_seal_required|>": "worm_seal_required",
  "<|build_receipt|>": "build_receipt",
  "<|reject_unsealed|>": "reject_unsealed",
  "<|executor_mode|>": "executor_mode",
};

export function extractSyscalls(text: string): SnapSyscall[] {
  return Object.entries(TOKEN_MAP)
    .filter(([token]) => text.includes(token))
    .map(([, syscall]) => syscall);
}

export function validateSyscalls(syscalls: SnapSyscall[]): {
  valid: boolean;
  invalid: string[];
} {
  const allowed = new Set(Object.values(TOKEN_MAP));
  const invalid = syscalls.filter((s) => !allowed.has(s));
  return { valid: invalid.length === 0, invalid };
}
