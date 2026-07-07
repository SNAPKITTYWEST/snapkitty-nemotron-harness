export function extractSyscalls(text: string): string[] {
  const matches = text.match(/<\|(\w+)\|>/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/<\||\|>/g, "")))];
}
