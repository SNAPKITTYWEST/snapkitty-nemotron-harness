interface Props {
  syscalls: string[];
  status?: string;
}

export default function SyscallTrace({ syscalls, status }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>SYSCALL TRACE</h2>
      {status && (
        <div style={{ fontSize: 11, marginBottom: 8, color: status === "ACCEPTED" ? "#00ff41" : "#ff4444" }}>
          Status: {status}
        </div>
      )}
      {syscalls.length === 0 && <div style={{ fontSize: 11, color: "#666" }}>No syscalls detected.</div>}
      {syscalls.map((s, i) => (
        <div key={i} style={{ fontFamily: "monospace", fontSize: 11, color: "#00ff41", marginBottom: 2 }}>
          {'<|' + s + '|>'}
        </div>
      ))}
    </div>
  );
}
