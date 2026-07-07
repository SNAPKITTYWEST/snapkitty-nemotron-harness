export async function api<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function callOllama(prompt: string, model?: string) {
  return api<{ output: string; model: string }>("/api/ollama", { prompt, model });
}

export async function testOllama() {
  return api<{ online: boolean; models: string[] }>("/api/ollama/test");
}

export async function runLean(path?: string) {
  return api<{ status: string; build: any; scan: any }>("/api/lean", { path });
}

export async function runProlog(query: string, file?: string) {
  return api<{ success: boolean; output: string }>("/api/prolog", { query, file });
}

export async function runBash(command: string, approve = false) {
  return api<{ status: string; stdout?: string; stderr?: string; reason?: string }>("/api/bash", { command, approve });
}

export async function runCurl(url: string, method = "GET", approve = false) {
  return api<{ status: string; httpStatus?: number; body?: string; error?: string }>("/api/curl", { url, method, approve });
}

export async function runSearch(query: string, provider = "duckduckgo", approve = false) {
  return api<{ status: string; results?: any[]; body?: string; marked?: string; error?: string }>("/api/search", { query, provider, approve });
}

export async function readFile(path: string) {
  return api<{ exists: boolean; content?: string }>("/api/file/read", { path });
}
