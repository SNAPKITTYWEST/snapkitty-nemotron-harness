import { useState, useEffect } from "react";
import { testOllama } from "../lib/ollama";

const BASE = localStorage.getItem("ollama_url") ?? "http://127.0.0.1:11434";

export default function ModelStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(localStorage.getItem("ollama_model") ?? "nemotron");
  const [url, setUrl] = useState(BASE);
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    localStorage.setItem("ollama_url", url);
    localStorage.setItem("ollama_model", model);
    const r = await testOllama(url);
    setOnline(r.online);
    setModels(r.models);
    setTesting(false);
  };

  useEffect(() => { test(); }, []);

  return (
    <div>
      <h2 style={{ fontSize: 14, marginBottom: 12, color: "#00ff41" }}>MODEL CONNECTION</h2>
      <div style={{ fontSize: 12, lineHeight: 2.2 }}>
        <label style={{ display: "block" }}>
          URL:
          <input value={url} onChange={(e) => setUrl(e.target.value)} style={input} />
        </label>
        <label style={{ display: "block" }}>
          Model:
          <input value={model} onChange={(e) => setModel(e.target.value)} style={input} />
        </label>
        <div>Ollama: {online === null ? "..." : online ? "online" : "offline"}</div>
        {models.length > 0 && <div>Models: {models.join(", ")}</div>}
        <div>Temperature: 0 | Seed: 42</div>
      </div>
      <button onClick={test} disabled={testing} style={btn}>
        {testing ? "Testing..." : "Test Model"}
      </button>
    </div>
  );
}

const input: React.CSSProperties = {
  marginLeft: 8, background: "#0a0a0a", color: "#00ff41", border: "1px solid #00ff41",
  padding: "2px 6px", fontFamily: "monospace", fontSize: 12, width: "80%",
};
const btn: React.CSSProperties = {
  marginTop: 12, padding: "6px 16px", background: "#00ff41", color: "#0a0a0a",
  border: "none", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold",
};
