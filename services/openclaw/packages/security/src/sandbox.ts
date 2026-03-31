/**
 * Agent Sandboxing — Restrict agents to their workspace.
 *
 * Prevents:
 * - Filesystem traversal (../../etc/passwd)
 * - Access outside workspace directory
 * - Arbitrary command execution
 * - Sensitive file access (.env, .ssh, credentials)
 */
import fs from 'fs';
import path from 'path';

const BLOCKED_PATHS = [
  '.env', '.env.local', '.env.production',
  '.ssh', '.gnupg', '.aws', '.config',
  '/etc', '/var', '/sys', '/proc',
  'node_modules/.cache',
];

const BLOCKED_EXTENSIONS = [
  '.pem', '.key', '.p12', '.pfx', '.jks',
];

export interface SandboxConfig {
  workspaceRoot: string;
  allowedPaths?: string[];    // Extra paths agent can access
  blockedPaths?: string[];    // Extra paths to block
  maxFileSize?: number;       // Max file size in bytes (default: 10MB)
  readOnly?: boolean;         // If true, agent can only read
}

export class AgentSandbox {
  private config: Required<SandboxConfig>;

  constructor(config: SandboxConfig) {
    this.config = {
      workspaceRoot: path.resolve(config.workspaceRoot),
      allowedPaths: (config.allowedPaths || []).map(p => path.resolve(p)),
      blockedPaths: [...BLOCKED_PATHS, ...(config.blockedPaths || [])],
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      readOnly: config.readOnly ?? false,
    };
  }

  /**
   * Validate that a path is within the sandbox.
   * Returns the resolved path if valid, throws if not.
   */
  validatePath(requestedPath: string): string {
    const resolved = path.resolve(this.config.workspaceRoot, requestedPath);

    // Check: must be within workspace root (or allowed paths)
    const isInWorkspace = resolved.startsWith(this.config.workspaceRoot + path.sep) || resolved === this.config.workspaceRoot;
    const isInAllowed = this.config.allowedPaths.some(ap => resolved.startsWith(ap + path.sep) || resolved === ap);

    if (!isInWorkspace && !isInAllowed) {
      throw new SandboxError(
        `Path traversal blocked: "${requestedPath}" resolves to "${resolved}" which is outside workspace`,
        'PATH_TRAVERSAL',
      );
    }

    // Check: not a blocked path
    for (const blocked of this.config.blockedPaths) {
      const blockedResolved = path.resolve(this.config.workspaceRoot, blocked);
      if (resolved.startsWith(blockedResolved + path.sep) || resolved === blockedResolved) {
        throw new SandboxError(
          `Access denied: "${requestedPath}" matches blocked pattern "${blocked}"`,
          'BLOCKED_PATH',
        );
      }
    }

    // Check: not a sensitive extension
    const ext = path.extname(resolved).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new SandboxError(
        `Access denied: "${requestedPath}" has blocked extension "${ext}"`,
        'BLOCKED_EXTENSION',
      );
    }

    return resolved;
  }

  /**
   * Safe read — validates path then reads.
   */
  readFile(requestedPath: string): Buffer {
    const resolved = this.validatePath(requestedPath);
    const stat = fs.statSync(resolved);

    if (stat.size > this.config.maxFileSize) {
      throw new SandboxError(
        `File too large: ${stat.size} bytes (max: ${this.config.maxFileSize})`,
        'FILE_TOO_LARGE',
      );
    }

    return fs.readFileSync(resolved);
  }

  /**
   * Safe write — validates path then writes.
   */
  writeFile(requestedPath: string, content: Buffer | string): void {
    if (this.config.readOnly) {
      throw new SandboxError('Read-only sandbox: writes not allowed', 'READ_ONLY');
    }

    const resolved = this.validatePath(requestedPath);

    // Ensure parent directory exists within sandbox
    const parentDir = path.dirname(resolved);
    if (!parentDir.startsWith(this.config.workspaceRoot)) {
      throw new SandboxError('Cannot write outside workspace', 'PATH_TRAVERSAL');
    }

    fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(resolved, content);
  }

  /**
   * Safe list — validates path then lists directory.
   */
  listDir(requestedPath: string): string[] {
    const resolved = this.validatePath(requestedPath);
    return fs.readdirSync(resolved);
  }

  /**
   * Validate a shell command for execution.
   * Returns true if allowed, throws if blocked.
   */
  validateCommand(command: string): void {
    const dangerous = [
      /\brm\s+-rf\s+\//,           // rm -rf /
      /\bmkfs\b/,                   // format disk
      /\bdd\b.*of=\/dev/,           // write to disk devices
      /\bcurl\b.*\|.*sh/,          // curl | sh
      /\bwget\b.*\|.*sh/,          // wget | sh
      /\bchmod\s+777/,             // chmod 777
      /\bsudo\b/,                   // sudo
      /\bsu\b/,                     // su
      /\bssh\b/,                    // ssh (external access)
      /\bscp\b/,                    // scp (external transfer)
      /\bnc\b.*-e/,                // netcat reverse shell
      /\bpython.*-c.*socket/,      // python reverse shell
      /\bbase64.*-d.*\|.*sh/,     // base64 decode and execute
    ];

    for (const pattern of dangerous) {
      if (pattern.test(command)) {
        throw new SandboxError(
          `Dangerous command blocked: matches pattern ${pattern}`,
          'DANGEROUS_COMMAND',
        );
      }
    }
  }
}

export class SandboxError extends Error {
  constructor(
    message: string,
    public code: 'PATH_TRAVERSAL' | 'BLOCKED_PATH' | 'BLOCKED_EXTENSION' | 'FILE_TOO_LARGE' | 'READ_ONLY' | 'DANGEROUS_COMMAND',
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}
