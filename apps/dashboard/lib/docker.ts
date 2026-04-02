/**
 * Docker Engine API client — talks to docker-socket-proxy over TCP.
 * Only available when DOCKER_PROXY_URL is set (services-ui profile active).
 */

const DOCKER_PROXY = process.env.DOCKER_PROXY_URL || "";

export interface ContainerSummary {
  id: string;
  name: string;
  serviceName: string;
  status: "running" | "exited" | "restarting" | "paused" | "dead" | "created";
  exitCode: number | null;
  startedAt: string;
  uptime: string;
  image: string;
  cpuPercent: number;
  memoryMb: number;
  memoryLimitMb: number;
}

function formatUptime(startedAt: string): string {
  if (!startedAt || startedAt === "0001-01-01T00:00:00Z") return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

async function dockerFetch(path: string, options?: RequestInit): Promise<Response> {
  if (!DOCKER_PROXY) throw new Error("Docker proxy not configured");
  return fetch(`${DOCKER_PROXY}/v1.47${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

export async function listContainers(): Promise<ContainerSummary[]> {
  if (!DOCKER_PROXY) return [];
  try {
    const filter = encodeURIComponent(JSON.stringify({ label: ["com.docker.compose.project=clawhq"] }));
    const res = await dockerFetch(`/containers/json?all=true&filters=${filter}`);
    if (!res.ok) return [];
    const raw: Array<{
      Id: string;
      Names: string[];
      Image: string;
      State: string;
      Status: string;
      Labels: Record<string, string>;
    }> = await res.json();

    return raw.map(c => {
      const name = (c.Names[0] || "").replace(/^\//, "");
      const serviceName = c.Labels["com.docker.compose.service"] || name;
      return {
        id: c.Id.slice(0, 12),
        name,
        serviceName,
        status: (c.State as ContainerSummary["status"]) || "created",
        exitCode: null,
        startedAt: "",
        uptime: c.Status,
        image: c.Image,
        cpuPercent: 0,
        memoryMb: 0,
        memoryLimitMb: 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getContainerStats(id: string): Promise<{ cpuPercent: number; memoryMb: number; memoryLimitMb: number }> {
  if (!DOCKER_PROXY) return { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0 };
  try {
    const res = await dockerFetch(`/containers/${id}/stats?stream=false`);
    if (!res.ok) return { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0 };
    const s = await res.json();
    const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
    const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
    const numCpus = s.cpu_stats.online_cpus || 1;
    const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * numCpus * 100 : 0;
    const memoryMb = (s.memory_stats?.usage || 0) / 1024 / 1024;
    const memoryLimitMb = (s.memory_stats?.limit || 1) / 1024 / 1024;
    return { cpuPercent: Math.round(cpuPercent * 10) / 10, memoryMb: Math.round(memoryMb), memoryLimitMb: Math.round(memoryLimitMb) };
  } catch {
    return { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0 };
  }
}

export async function inspectContainer(id: string): Promise<{ startedAt: string; exitCode: number | null }> {
  if (!DOCKER_PROXY) return { startedAt: "", exitCode: null };
  try {
    const res = await dockerFetch(`/containers/${id}/json`);
    if (!res.ok) return { startedAt: "", exitCode: null };
    const data = await res.json();
    return {
      startedAt: data.State?.StartedAt || "",
      exitCode: data.State?.ExitCode ?? null,
    };
  } catch {
    return { startedAt: "", exitCode: null };
  }
}

export async function restartContainer(idOrName: string): Promise<boolean> {
  if (!DOCKER_PROXY) return false;
  try {
    const res = await dockerFetch(`/containers/${idOrName}/restart?t=10`, { method: "POST" });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

export async function getContainerLogs(id: string, tail = 100): Promise<string> {
  if (!DOCKER_PROXY) return "";
  try {
    const res = await dockerFetch(`/containers/${id}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=1`);
    if (!res.ok) return "";
    // Docker log stream uses a multiplexed format: 8-byte header + payload
    const buf = await res.arrayBuffer();
    return parseDockerLogs(buf);
  } catch {
    return "";
  }
}

function parseDockerLogs(buf: ArrayBuffer): string {
  const view = new DataView(buf);
  const lines: string[] = [];
  let offset = 0;
  while (offset < buf.byteLength - 8) {
    const size = view.getUint32(offset + 4, false);
    if (size === 0) { offset += 8; continue; }
    const chunk = new Uint8Array(buf, offset + 8, Math.min(size, buf.byteLength - offset - 8));
    lines.push(new TextDecoder().decode(chunk));
    offset += 8 + size;
  }
  return lines.join("");
}

export function isDockerAvailable(): boolean {
  return !!DOCKER_PROXY;
}

export { formatUptime };
