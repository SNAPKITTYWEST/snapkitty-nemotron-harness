import type { ToolResult } from "../App";

export default function ToolOutput({ tools }: { tools: ToolResult[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>TOOL OUTPUT</h2>
      {tools.length === 0 ? (
        <div style={{ color: "#666", fontSize: 11 }}>No tools executed</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tools.map((t) => (
            <div key={t.name} style={{ border: "1px solid #333", borderRadius: 3, padding: 8, background: "#0a0a0a" }}>
              <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
                {t.name.toUpperCase()}: <span style={{ color: t.status === "PROVED" || t.status === "PASS" ? "#00ff41" : t.status === "SPEC" ? "#ffb000" : "#ff4141" }}>{t.status}</span>
              </div>
              <pre style={{ fontSize: 10, color: "#888", maxHeight: 80, overflow: "auto", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(t.output, null, 2).slice(0, 500)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
