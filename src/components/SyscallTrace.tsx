const GATE_MAP: Record<string, { gate: string; color: string }> = {
  lean_gate: { gate: "Lean 4", color: "#00ff41" },
  prolog_gate: { gate: "Prolog", color: "#00ff41" },
  emojicode_persona: { gate: "Persona", color: "#ffb000" },
  tavily_search: { gate: "Retrieval", color: "#00bfff" },
  google_search: { gate: "Retrieval", color: "#00bfff" },
  curl_fetch: { gate: "Network", color: "#ffb000" },
  bash_exec: { gate: "Sandbox", color: "#ff4141" },
  file_read: { gate: "File", color: "#00ff41" },
  file_write: { gate: "File", color: "#ff4141" },
  build_check: { gate: "Build", color: "#00ff41" },
  receipt_seal: { gate: "Receipt", color: "#00ff41" },
  reject_untrusted: { gate: "Policy", color: "#ff4141" },
  kernel_verify: { gate: "Kernel", color: "#00ff41" },
  ere_check: { gate: "ERE", color: "#00ff41" },
  worm_seal_required: { gate: "WORM", color: "#00ff41" },
  build_receipt: { gate: "Receipt", color: "#00ff41" },
  reject_unsealed: { gate: "Policy", color: "#ff4141" },
  executor_mode: { gate: "Persona", color: "#ffb000" },
};

export default function SyscallTrace({ syscalls, status }: { syscalls: string[]; status?: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>SYSCALL TRACE</h2>
      {syscalls.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11 }}>No syscalls emitted</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {syscalls.map((t) => {
            const g = GATE_MAP[t] ?? { gate: "Unknown", color: "#ff4141" };
            return (
              <div key={t} style={{
                display: "flex", justifyContent: "space-between", padding: "4px 8px",
                border: `1px solid ${g.color}33`, borderRadius: 3, fontSize: 11, background: "#0a0a0a",
              }}>
                <span style={{ fontFamily: "monospace" }}>{`<|${t}|>`}</span>
                <span style={{ color: g.color }}>→ {g.gate}</span>
              </div>
            );
          })}
        </div>
      )}
      {status && (
        <div style={{ marginTop: 8, fontSize: 11, color: status === "ACCEPTED" ? "#00ff41" : "#ff4141", fontWeight: "bold" }}>
          {status}
        </div>
      )}
    </div>
  );
}
