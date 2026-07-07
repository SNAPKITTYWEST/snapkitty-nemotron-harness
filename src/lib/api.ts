export async function callOllama(prompt: string, model: string): Promise<{ output: string }> {
  const res = await fetch("/api/ollama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model }),
  });
  return res.json();
}

export async function runLean(): Promise<{ status: string; output: string }> {
  const res = await fetch("/api/lean", { method: "POST" });
  return res.json();
}

export async function runProlog(query: string): Promise<{ success: boolean; output: string }> {
  const res = await fetch("/api/prolog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function runBash(cmd: string): Promise<{ output: string; allowed: boolean }> {
  const res = await fetch("/api/bash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command: cmd }),
  });
  return res.json();
}

export async function runSearch(query: string, engine: string, untrusted: boolean): Promise<{ output: string; status: string }> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, engine, untrusted }),
  });
  return res.json();
}
