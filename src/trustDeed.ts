import fs from "node:fs";

export type SyscallPolicy = {
  enabled: boolean;
  requires_approval: boolean;
  requires_receipt: boolean;
  label?: string;
};

export type TrustDeed = {
  name: string;
  version: string;
  authority: string;
  model_role: string;
  default_mode: string;
  core_rules: Record<string, unknown>;
  allowed_syscalls: Record<string, SyscallPolicy>;
  denied_commands: string[];
};

export function loadTrustDeed(path = "trust-deed.json"): TrustDeed {
  const raw = fs.readFileSync(path, "utf8");
  return JSON.parse(raw) as TrustDeed;
}
