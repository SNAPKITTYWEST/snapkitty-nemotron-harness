const LABELS: Record<string, { allowed: boolean; reason: string }> = {
  executor_mode: { allowed: true, reason: "No clarification allowed" },
  kernel_verify: { allowed: true, reason: "Trust boundary crossing" },
  ere_check: { allowed: true, reason: "ERE-5 evaluation" },
  worm_seal_required: { allowed: true, reason: "WORM seal required" },
  build_receipt: { allowed: true, reason: "Build artifact produced" },
  reject_unsealed: { allowed: true, reason: "Unsealed input rejected" },
};

export default function SyscallTrace({ syscalls, status }: { syscalls: string[]; status?: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>SYSCALL TRACE</h2>
      {syscalls.length === 0 ? (
        <div style={{ color: "#666", fontSize: 12 }}>No syscalls emitted</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {syscalls.map((t) => {
            const p = LABELS[t] ?? { allowed: false, reason: "Unknown token" };
            return (
              <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px",
                border: `1px solid ${p.allowed ? "#00ff41" : "#ff4141"}`, borderRadius: 4, fontSize: 12 }}>
                <span style={{ fontFamily: "monospace" }}>{`<|${t}|>`}</span>
                <span style={{ color: p.allowed ? "#00ff41" : "#ff4141", fontSize: 11 }}>
                  {p.allowed ? "ALLOWED" : "REJECTED"} — {p.reason}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {status && (
        <div style={{ marginTop: 12, fontSize: 12, color: status === "ACCEPTED" ? "#00ff41" : "#ff4141" }}>
          Status: {status}
        </div>
      )}
    </div>
  );
}
