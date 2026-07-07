import type { SyscallGateResult } from "../gates/prologGate";

interface Props {
  results: SyscallGateResult[];
  engine: "tau-prolog" | "swi-prolog";
  mode: "browser" | "local";
}

export default function PolicyGatePanel({ results, engine, mode }: Props) {
  const allowed = results.filter((r) => r.label === "ALLOWED").length;
  const approval = results.filter((r) => r.label === "APPROVAL").length;
  const rejected = results.filter((r) => r.label === "REJECTED").length;
  const needsReceipt = results.some((r) => r.receiptRequired);

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>
        POLICY GATE
      </h2>

      <div style={{ fontSize: 11, marginBottom: 8, color: "#999" }}>
        <div>
          Prolog Engine: <span style={{ color: "#00ff41" }}>{engine}</span>
        </div>
        <div>
          Mode: <span style={{ color: "#00ff41" }}>{mode}</span>
        </div>
        <div>
          Syscalls detected:{" "}
          <span style={{ color: "#00ff41" }}>{results.length}</span>
        </div>
        <div>
          Allowed: <span style={{ color: "#00ff41" }}>{allowed}</span>
        </div>
        <div>
          Requires approval: <span style={{ color: "#ffb000" }}>{approval}</span>
        </div>
        <div>
          Rejected: <span style={{ color: "#ff4444" }}>{rejected}</span>
        </div>
        <div>
          Receipt required:{" "}
          <span style={{ color: needsReceipt ? "#00ff41" : "#666" }}>
            {needsReceipt ? "yes" : "no"}
          </span>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ borderTop: "1px solid #333", paddingTop: 8 }}>
          {results.map((r) => (
            <div
              key={r.syscall}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "monospace",
                marginBottom: 4,
              }}
            >
              <span style={{ color: "#00ff41" }}>{`<|${r.syscall}|>`}</span>
              <span
                style={{
                  color:
                    r.label === "ALLOWED"
                      ? "#00ff41"
                      : r.label === "APPROVAL"
                      ? "#ffb000"
                      : "#ff4444",
                }}
              >
                {r.label}
                {r.receiptRequired ? "  receipt required" : ""}
                {r.requiresApproval ? "  dangerous syscall" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div style={{ fontSize: 11, color: "#666" }}>
          No syscalls detected. Run a prompt to see gate evaluation.
        </div>
      )}
    </div>
  );
}
