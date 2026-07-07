const TOKEN_MAP: Record<string, string> = {
  "<|executor_mode|>": "executor_mode",
  "<|kernel_verify|>": "kernel_verify",
  "<|ere_check|>": "ere_check",
  "<|worm_seal_required|>": "worm_seal_required",
  "<|build_receipt|>": "build_receipt",
  "<|reject_unsealed|>": "reject_unsealed",
};

const POLICY: Record<string, { allowed: boolean; reason: string }> = {
  executor_mode: { allowed: true, reason: "No clarification allowed" },
  kernel_verify: { allowed: true, reason: "Trust boundary crossing" },
  ere_check: { allowed: true, reason: "ERE-5 evaluation" },
  worm_seal_required: { allowed: true, reason: "WORM seal required" },
  build_receipt: { allowed: true, reason: "Build artifact produced" },
  reject_unsealed: { allowed: true, reason: "Unsealed input rejected" },
};

interface Props {
  syscalls: string[];
  status?: string;
}

export default function SyscallTrace({ syscalls, status }: Props) {
  const parsed = syscalls.map((token) => {
    const name = TOKEN_MAP[token] ?? token;
    const policy = POLICY[name] ?? { allowed: false, reason: "Unknown token" };
    return { token, name, ...policy };
  });

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>SYSCALL TRACE</h2>
      {parsed.length === 0 ? (
        <div style={{ color: "#666", fontSize: 12 }}>No syscalls emitted</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {parsed.map((s) => (
            <div
              key={s.token}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                border: `1px solid ${s.allowed ? "#00ff41" : "#ff4141"}`,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{s.token}</span>
              <span style={{ color: s.allowed ? "#00ff41" : "#ff4141", fontSize: 11 }}>
                {s.allowed ? "ALLOWED" : "REJECTED"} — {s.reason}
              </span>
            </div>
          ))}
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
