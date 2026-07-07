import { loadTrustDeed } from "./trustDeed.js";
import { normalizeModelOutput, NormalizedModelOutput } from "./normalize.js";
import { checkAllSyscalls, GateDecision } from "./policyGate.js";
import { writeReceipt, ReceiptEntry } from "./receipt.js";

export type HarnessResult = {
  status: "ACCEPTED" | "REJECTED" | "APPROVAL_REQUIRED";
  normalized: NormalizedModelOutput;
  gate: GateDecision[];
  receipt: ReceiptEntry;
};

export async function runHarness(rawModelOutput: string): Promise<HarnessResult> {
  const deed = loadTrustDeed();
  const normalized = normalizeModelOutput(rawModelOutput);
  const gate = checkAllSyscalls(deed, normalized.syscalls);

  const rejected = gate.some((g) => g.status === "REJECT");
  const approval = gate.some((g) => g.status === "APPROVAL_REQUIRED");

  const status = rejected
    ? "REJECTED"
    : approval
      ? "APPROVAL_REQUIRED"
      : "ACCEPTED";

  const receipt = writeReceipt({
    kind: "model_output_gate",
    trust_deed: deed.name,
    trust_deed_version: deed.version,
    status,
    raw_output: normalized.raw,
    syscalls: normalized.syscalls,
    gate
  });

  return {
    status,
    normalized,
    gate,
    receipt
  };
}
