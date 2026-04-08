import { NextResponse } from "next/server";

const REPO = "modologystudios/clawhq";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";

// Injected at Docker build time via ARG CLAWHQ_GIT_SHA
const CURRENT_SHA = process.env.CLAWHQ_GIT_SHA ?? "dev";

// Simple in-process cache so we don't hammer GitHub API on every poll
let cache: { ts: number; data: VersionInfo } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface VersionInfo {
  current: string;          // SHA or "dev"
  latest: string;           // SHA of main
  upToDate: boolean;
  commitsAhead: number;     // commits on main that current is missing
  recentCommits: CommitSummary[];
  error?: string;
}

async function fetchGitHub(path: string) {
  const headers: Record<string, string> = { "Accept": "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers,
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function computeVersionInfo(): Promise<VersionInfo> {
  // Get latest commit on main
  const latest = await fetchGitHub("/commits/main");
  const latestSha: string = latest.sha;

  if (CURRENT_SHA === "dev") {
    const commits = (latest.sha ? [latest] : []).map((c: { sha: string; commit: { message: string; author: { name: string; date: string } } }) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name ?? "unknown",
      date: c.commit.author?.date ?? "",
    }));
    return { current: "dev", latest: latestSha.slice(0, 7), upToDate: false, commitsAhead: -1, recentCommits: commits };
  }

  if (CURRENT_SHA.slice(0, 7) === latestSha.slice(0, 7) || CURRENT_SHA === latestSha) {
    return { current: CURRENT_SHA.slice(0, 7), latest: latestSha.slice(0, 7), upToDate: true, commitsAhead: 0, recentCommits: [] };
  }

  // Compare current...main to find how many commits behind we are
  const compare = await fetchGitHub(`/compare/${CURRENT_SHA}...${latestSha}`);
  const commitsAhead: number = compare.ahead_by ?? 0;
  const recentCommits: CommitSummary[] = (compare.commits ?? [])
    .slice(-10)
    .reverse()
    .map((c: { sha: string; commit: { message: string; author: { name: string; date: string } } }) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      author: c.commit.author?.name ?? "unknown",
      date: c.commit.author?.date ?? "",
    }));

  return {
    current: CURRENT_SHA.slice(0, 7),
    latest: latestSha.slice(0, 7),
    upToDate: commitsAhead === 0,
    commitsAhead,
    recentCommits,
  };
}

export async function GET() {
  // Return cached result if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  try {
    const data = await computeVersionInfo();
    cache = { ts: Date.now(), data };
    return NextResponse.json(data);
  } catch (e) {
    const fallback: VersionInfo = {
      current: CURRENT_SHA === "dev" ? "dev" : CURRENT_SHA.slice(0, 7),
      latest: "unknown",
      upToDate: true, // assume up to date on error to avoid false alarms
      commitsAhead: 0,
      recentCommits: [],
      error: String(e),
    };
    return NextResponse.json(fallback);
  }
}
