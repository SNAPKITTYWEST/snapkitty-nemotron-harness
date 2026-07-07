import { extractSyscalls, Syscall } from "./syscall.js";

export type NormalizedModelOutput = {
  raw: string;
  decision: string;
  assumptions: string[];
  syscalls: Syscall[];
  requestedTools: Syscall[];
  uncertainty: "NONE" | "SPEC" | "OBLIGATION";
};

export function normalizeModelOutput(raw: string): NormalizedModelOutput {
  const syscalls = extractSyscalls(raw);

  const uncertainty =
    raw.includes("OBLIGATION") ? "OBLIGATION" :
    raw.includes("SPEC") ? "SPEC" :
    "NONE";

  return {
    raw,
    decision: raw.slice(0, 500),
    assumptions: [],
    syscalls,
    requestedTools: syscalls,
    uncertainty
  };
}
