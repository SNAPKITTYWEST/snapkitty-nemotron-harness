import type { RunResult } from "../App";

interface Props {
  result: RunResult | null;
}

export default function GateResult({ result }: Props) {
  if (!result) {
    return (
      <div>
        <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>PROLOG GATE</h2>
        <div style={{ color: "#666", fontSize: 12 }}>No run yet</div>
      </div>
    );
  }

  const { status, receipt } = result;
  const pass = status === "ACCEPTED";

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>PROLOG GATE</h2>
      <div style={{ fontSize: 12, lineHeight: 2 }}>
        <div style={{ color: pass ? "#00ff41" : "#ff4141" }}>Gate: {pass ? "PASS" : "FAIL"}</div>
        <div>Policy: executor_mode_allowed</div>
        <div>Required receipt: yes</div>
        <div>
          Rejected syscalls:{" "}
          {result.syscalls.filter((s) => s.includes("reject")).join(", ") || "none"}
        </div>
        <div>Prolog validated: {receipt.prolog_validated ? "yes" : "no"}</div>
      </div>
    </div>
  );
}
