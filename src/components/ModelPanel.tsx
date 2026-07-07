import { useState, useEffect } from "react";
import { testOllama } from "../lib/api";

interface Props {
  url: string; model: string;
  onUrlChange: (s: string) => void; onModelChange: (s: string) => void;
}

export default function ModelPanel({ url, model, onUrlChange, onModelChange }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    localStorage.setItem("ollama_url", url);
    localStorage.setItem("ollama_model", model);
    const r = await testOllama();
    setOnline(r.online);
    setModels(r.models);
    setTesting(false);
  };

  useEffect(() => { test(); }, []);

  return (
    <div>
      <h2 style={{ fontSize: 13, marginBottom: 10, color: "#00ff41" }}>MODEL</h2>
      <label style={lbl}>URL <input value={url} onChange={(e) => onUrlChange(e.target.value)} style={inp} /></label>
      <label style={lbl}>Model <input value={model} onChange={(e) => onModelChange(e.target.value)} style={inp} /></label>
      <div style={{ fontSize: 11, marginTop: 6 }}>
        Status: <span style={{ color: online ? "#00ff41" : "#ff4141" }}>{online === null ? "..." : online ? "ONLINE" : "OFFLINE"}</span>
        {models.length > 0 && <span style={{ color: "#666" }}> | {models.slice(0, 3).join(", ")}</span>}
      </div>
      <button onClick={test} disabled={testing} style={btn}>{testing ? "..." : "Test"}</button>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, marginBottom: 4 };
const inp: React.CSSProperties = {
  marginLeft: 6, background: "#0a0a0a", color: "#00ff41", border: "1px solid #333",
  padding: "2px 6px", fontFamily: "monospace", fontSize: 11, width: "70%",
};
const btn: React.CSSProperties = {
  marginTop: 8, padding: "4px 12px", background: "#1a1a1a", color: "#00ff41",
  border: "1px solid #00ff41", cursor: "pointer", fontFamily: "monospace", fontSize: 11,
};
