export interface ToolConfig {
  lean4: boolean;
  prolog: boolean;
  tavily: boolean;
  google: boolean;
  curl: boolean;
  bash: boolean;
}

interface Props {
  tools: ToolConfig;
  onChange: (t: ToolConfig) => void;
}

const TOOL_LIST: { key: keyof ToolConfig; label: string }[] = [
  { key: "lean4", label: "Lean 4" },
  { key: "prolog", label: "Prolog" },
  { key: "tavily", label: "Tavily" },
  { key: "google", label: "Google" },
  { key: "curl", label: "curl" },
  { key: "bash", label: "bash" },
];

export default function ToolGatePanel({ tools, onChange }: Props) {
  const toggle = (key: keyof ToolConfig) => onChange({ ...tools, [key]: !tools[key] });

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>TOOL GATES</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {TOOL_LIST.map((t) => (
          <button key={t.key} onClick={() => toggle(t.key)} style={{
            padding: "6px 14px", fontFamily: "monospace", fontSize: 11, cursor: "pointer",
            background: tools[t.key] ? "#00ff41" : "#1a1a1a",
            color: tools[t.key] ? "#0a0a0a" : "#666",
            border: `1px solid ${tools[t.key] ? "#00ff41" : "#333"}`,
          }}>
            {t.label}: {tools[t.key] ? "ON" : "OFF"}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "#666" }}>
        Tools execute only by syscall token. Disabled tools are ignored even if emitted.
      </div>
    </div>
  );
}
