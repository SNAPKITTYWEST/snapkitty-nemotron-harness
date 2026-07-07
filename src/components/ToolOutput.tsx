interface Props {
  tools: any[];
}

export default function ToolOutput({ tools }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>TOOL OUTPUT</h2>
      {tools.length === 0 && <div style={{ fontSize: 11, color: "#666" }}>No tool output yet.</div>}
      {tools.map((t, i) => (
        <div key={i} style={{ marginBottom: 8, fontSize: 11 }}>
          <div style={{ color: t.status === "PASS" ? "#00ff41" : "#ffb000", fontWeight: "bold" }}>
            {t.name}: {t.status}
          </div>
          <pre style={{ color: "#999", fontSize: 10, marginTop: 4, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(t.output, null, 2)?.slice(0, 200)}
          </pre>
        </div>
      ))}
    </div>
  );
}
