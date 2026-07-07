import { TrustDeed } from "./trustDeed.js";
import { Syscall } from "./syscall.js";

export type GateDecision = {
  syscall: Syscall;
  status: "ALLOW" | "REJECT" | "APPROVAL_REQUIRED";
  reason: string;
  requiresReceipt: boolean;
};

export function checkSyscall(
  deed: TrustDeed,
  syscall: Syscall
): GateDecision {
  const policy = deed.allowed_syscalls[syscall];

  if (!policy) {
    return {
      syscall,
      status: "REJECT",
      reason: "Syscall is not defined in trust deed.",
      requiresReceipt: true
    };
  }

  if (!policy.enabled) {
    return {
      syscall,
      status: policy.requires_approval ? "APPROVAL_REQUIRED" : "REJECT",
      reason: "Syscall is disabled by trust deed.",
      requiresReceipt: policy.requires_receipt
    };
  }

  if (policy.requires_approval) {
    return {
      syscall,
      status: "APPROVAL_REQUIRED",
      reason: "Syscall requires explicit approval.",
      requiresReceipt: policy.requires_receipt
    };
  }

  return {
    syscall,
    status: "ALLOW",
    reason: "Syscall allowed by trust deed.",
    requiresReceipt: policy.requires_receipt
  };
}

export function checkAllSyscalls(
  deed: TrustDeed,
  syscalls: Syscall[]
): GateDecision[] {
  return syscalls.map((s) => checkSyscall(deed, s));
}
