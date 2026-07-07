import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SWIPL_PATH = process.env.SWIPL_PATH ?? "swipl";

export async function runPrologQuery(
  kernelPath: string,
  query: string
): Promise<{ success: boolean; output: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(SWIPL_PATH, [
      "-g",
      query,
      "-t",
      "halt.",
      kernelPath,
    ]);
    return { success: true, output: stdout.trim() || stderr.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: msg };
  }
}

export async function validateSyscallsViaProlog(
  syscalls: string[]
): Promise<{ valid: boolean; output: string }> {
  if (syscalls.length === 0) {
    return { valid: true, output: "no syscalls to validate" };
  }

  const prologList = syscalls.map((s) => `'${s}'`).join(",");
  const query = `valid_execution([${prologList}])`;

  const result = await runPrologQuery("./kernel/syscalls.pl", query);
  return { valid: result.success, output: result.output };
}
