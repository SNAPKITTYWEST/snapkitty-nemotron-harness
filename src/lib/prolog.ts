const ALLOWED = new Set([
  "kernel_verify",
  "ere_check",
  "worm_seal_required",
  "build_receipt",
  "reject_unsealed",
  "executor_mode",
]);

const REQUIRES_RECEIPT = new Set([
  "kernel_verify",
  "ere_check",
  "worm_seal_required",
  "build_receipt",
]);

export function validateSyscallsProlog(syscalls: string[]): {
  valid: boolean;
  output: string;
} {
  const invalid = syscalls.filter((s) => !ALLOWED.has(s));
  if (invalid.length > 0) {
    return { valid: false, output: `rejected: ${invalid.join(", ")}` };
  }

  const needReceipt = syscalls.filter((s) => REQUIRES_RECEIPT.has(s as string));
  if (needReceipt.length > 0) {
    return {
      valid: true,
      output: `accepted (receipt required for: ${needReceipt.join(", ")})`,
    };
  }

  return { valid: true, output: "accepted" };
}
