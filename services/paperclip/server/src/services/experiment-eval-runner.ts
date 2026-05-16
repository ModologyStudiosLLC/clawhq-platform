import { execFile } from "child_process";
import { promisify } from "util";
import type { ExperimentEvalKind } from "@paperclipai/shared";

const execFileAsync = promisify(execFile);

const EVAL_TIMEOUT_MS = 60_000;

export interface EvalResult {
  score: number;
  raw: string;
}

export async function runEval(
  evalKind: ExperimentEvalKind,
  evalCommand: string,
  timeoutMs = EVAL_TIMEOUT_MS,
): Promise<EvalResult> {
  switch (evalKind) {
    case "shell":
      return runShellEval(evalCommand, timeoutMs);
    case "http":
      return runHttpEval(evalCommand, timeoutMs);
    case "js":
      return runJsEval(evalCommand, timeoutMs);
    default:
      throw new Error(`Unknown eval kind: ${evalKind}`);
  }
}

async function runShellEval(command: string, timeoutMs: number): Promise<EvalResult> {
  let stdout = "";
  let stderr = "";
  try {
    const result = await execFileAsync("sh", ["-c", command], {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    stdout = execErr.stdout ?? "";
    stderr = execErr.stderr ?? execErr.message ?? String(err);
  }

  const raw = (stdout + stderr).trim();
  // Parse the last non-empty line as a float
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? "";
  const score = parseFloat(lastLine);
  if (!Number.isFinite(score)) {
    throw new Error(`Eval output did not end with a numeric score. Last line: "${lastLine}"`);
  }
  return { score, raw };
}

async function runHttpEval(url: string, timeoutMs: number): Promise<EvalResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      throw new Error(`HTTP eval returned ${resp.status}`);
    }
    const body = (await resp.json()) as unknown;
    if (typeof body !== "object" || body === null || !("score" in body)) {
      throw new Error(`HTTP eval response must be JSON with a "score" field`);
    }
    const score = Number((body as { score: unknown }).score);
    if (!Number.isFinite(score)) {
      throw new Error(`HTTP eval "score" is not a finite number`);
    }
    return { score, raw: JSON.stringify(body) };
  } finally {
    clearTimeout(timer);
  }
}

async function runJsEval(script: string, timeoutMs: number): Promise<EvalResult> {
  // Use vm.runInNewContext with a timeout for simple numeric scripts.
  // The script must evaluate to a number or a Promise<number>.
  const { runInNewContext } = await import("vm");
  const wrapped = `(async () => { ${script} })()`;
  const result = await Promise.race([
    runInNewContext(wrapped, {}, { timeout: timeoutMs }) as Promise<unknown>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("JS eval timed out")), timeoutMs),
    ),
  ]);
  const score = Number(result);
  if (!Number.isFinite(score)) {
    throw new Error(`JS eval did not return a finite number, got: ${result}`);
  }
  return { score, raw: String(score) };
}
