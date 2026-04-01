/**
 * OWASP + STRIDE Security Audit Module
 *
 * Integrates security auditing into ClawHQ's harness framework.
 * Two complementary approaches:
 *
 * OWASP Top 10 (2021) — web application security risks
 * STRIDE — threat modeling for system design
 *
 * Each check returns a finding with severity, description, and remediation.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface SecurityFinding {
  id: string;
  framework: 'OWASP' | 'STRIDE';
  category: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  remediation: string;
  codeLocation?: string;
  evidence?: string;
}

export interface AuditReport {
  timestamp: string;
  scope: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
}

// ── OWASP Top 10 (2021) Checks ─────────────────────────────────────────

const OWASP_CHECKS = [
  {
    id: 'A01',
    category: 'Broken Access Control',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /req\.(user|session)\s*[!=]==?\s*null/g, desc: 'Null check on user/session without proper auth middleware' },
        { regex: /\.role\s*===?\s*['"]admin['"]/g, desc: 'Hardcoded role check — use RBAC instead' },
        { regex: /bypass|skip.*auth/gi, desc: 'Auth bypass pattern detected' },
      ];
      for (const p of patterns) {
        if (p.regex.test(code)) {
          return {
            id: 'A01',
            framework: 'OWASP',
            category: 'Broken Access Control',
            title: 'Potential access control weakness',
            severity: 'high',
            description: p.desc,
            remediation: 'Use proper authentication middleware and RBAC. Never hardcode role checks.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'A02',
    category: 'Cryptographic Failures',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /md5|sha1(?!\()/gi, desc: 'Weak hash algorithm (MD5/SHA1)' },
        { regex: /DES|RC4/g, desc: 'Weak encryption algorithm' },
        { regex: /Math\.random\(\)/g, desc: 'Math.random() is not cryptographically secure — use crypto.randomBytes()' },
        { regex: /password.*=.*['"][^'"]+['"]/gi, desc: 'Hardcoded password detected' },
      ];
      for (const p of patterns) {
        if (p.regex.test(code)) {
          return {
            id: 'A02',
            framework: 'OWASP',
            category: 'Cryptographic Failures',
            title: 'Cryptographic weakness',
            severity: 'high',
            description: p.desc,
            remediation: 'Use strong algorithms (AES-256, SHA-256+). Use crypto.randomBytes() for randomness. Never hardcode secrets.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'A03',
    category: 'Injection',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /eval\s*\(/g, desc: 'eval() usage — potential code injection' },
        { regex: /innerHTML\s*=/g, desc: 'innerHTML assignment — potential XSS' },
        { regex: /\$\{.*\}.*sql|query.*\$\{/gi, desc: 'Template literal in SQL — potential SQL injection' },
        { regex: /exec\s*\(\s*['"`].*\$/g, desc: 'Shell command with variable interpolation — command injection risk' },
      ];
      for (const p of patterns) {
        if (p.regex.test(code)) {
          return {
            id: 'A03',
            framework: 'OWASP',
            category: 'Injection',
            title: 'Potential injection vulnerability',
            severity: 'critical',
            description: p.desc,
            remediation: 'Use parameterized queries. Sanitize all user input. Never use eval().',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'A05',
    category: 'Security Misconfiguration',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /CORS.*\*/g, desc: 'Wildcard CORS — allows any origin' },
        { regex: /debug.*true|DEBUG.*True/g, desc: 'Debug mode enabled' },
        { regex: /X-Frame-Options.*DENY/gi, desc: null }, // This is GOOD, not a finding
        { regex: /helmet|security.*headers/gi, desc: null }, // This is GOOD
      ];
      for (const p of patterns) {
        if (p.desc && p.regex.test(code)) {
          return {
            id: 'A05',
            framework: 'OWASP',
            category: 'Security Misconfiguration',
            title: 'Security misconfiguration',
            severity: 'medium',
            description: p.desc,
            remediation: 'Restrict CORS to specific origins. Disable debug in production. Add security headers.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'A07',
    category: 'Identification and Authentication Failures',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /session.*timeout.*null|no.*session.*expiry/gi, desc: 'No session timeout configured' },
        { regex: /brute.?force|rate.?limit/gi, desc: null }, // GOOD
        { regex: /token.*=.*['"]\w{1,10}['"]/g, desc: 'Short/hardcoded token detected' },
      ];
      for (const p of patterns) {
        if (p.desc && p.regex.test(code)) {
          return {
            id: 'A07',
            framework: 'OWASP',
            category: 'Identification and Authentication Failures',
            title: 'Authentication weakness',
            severity: 'high',
            description: p.desc,
            remediation: 'Set session timeouts. Implement rate limiting. Use strong, unique tokens.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'A09',
    category: 'Security Logging and Monitoring Failures',
    check: (code: string): SecurityFinding | null => {
      const hasLogging = /console\.(log|error|warn)|logger\.|audit/gi.test(code);
      if (!hasLogging) {
        return {
          id: 'A09',
          framework: 'OWASP',
          category: 'Security Logging and Monitoring Failures',
          title: 'No security logging detected',
          severity: 'medium',
          description: 'No logging found in security-sensitive code paths.',
          remediation: 'Add audit logging for authentication, authorization, and data access events.',
        };
      }
      return null;
    },
  },
];

// ── STRIDE Threat Modeling ──────────────────────────────────────────────

const STRIDE_CHECKS = [
  {
    id: 'S',
    category: 'Spoofing',
    check: (code: string): SecurityFinding | null => {
      if (/api.?key|token|bearer/gi.test(code) && !/verify|validate|check/gi.test(code)) {
        return {
          id: 'S',
          framework: 'STRIDE',
          category: 'Spoofing',
          title: 'API key/token used without verification',
          severity: 'high',
          description: 'API keys or tokens are used but verification is not visible.',
          remediation: 'Always verify tokens before granting access. Use middleware for token validation.',
        };
      }
      return null;
    },
  },
  {
    id: 'T',
    category: 'Tampering',
    check: (code: string): SecurityFinding | null => {
      if (/PUT|POST|PATCH/i.test(code) && !/validat|sanitiz|escap/i.test(code)) {
        return {
          id: 'T',
          framework: 'STRIDE',
          category: 'Tampering',
          title: 'Data modification without validation',
          severity: 'medium',
          description: 'POST/PUT/PATCH endpoints found without visible input validation.',
          remediation: 'Validate all input data. Use schema validation (Zod, Joi, etc.).',
        };
      }
      return null;
    },
  },
  {
    id: 'R',
    category: 'Repudiation',
    check: (code: string): SecurityFinding | null => {
      if (/DELETE|remove|revoke/i.test(code) && !/log|audit|record/i.test(code)) {
        return {
          id: 'R',
          framework: 'STRIDE',
          category: 'Repudiation',
          title: 'Destructive action without audit logging',
          severity: 'medium',
          description: 'DELETE/remove operations without audit trail.',
          remediation: 'Log all destructive actions with user ID, timestamp, and target.',
        };
      }
      return null;
    },
  },
  {
    id: 'I',
    category: 'Information Disclosure',
    check: (code: string): SecurityFinding | null => {
      const patterns = [
        { regex: /stack.?trace|error\.stack/gi, desc: 'Stack traces may be exposed to users' },
        { regex: /console\.log\(.*password|console\.log\(.*secret|console\.log\(.*key/gi, desc: 'Secrets logged to console' },
        { regex: /json\.stringify\(.*error/gi, desc: 'Error objects may expose internal details' },
      ];
      for (const p of patterns) {
        if (p.regex.test(code)) {
          return {
            id: 'I',
            framework: 'STRIDE',
            category: 'Information Disclosure',
            title: 'Potential information leakage',
            severity: 'high',
            description: p.desc,
            remediation: 'Never expose stack traces or secrets in logs or responses. Use error sanitization.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'D',
    category: 'Denial of Service',
    check: (code: string): SecurityFinding | null => {
      if (/while\s*\(\s*true|for\s*\(\s*;\s*;\s*\)/g.test(code)) {
        return {
          id: 'D',
          framework: 'STRIDE',
          category: 'Denial of Service',
          title: 'Infinite loop detected',
          severity: 'high',
          description: 'Potential infinite loop that could cause DoS.',
          remediation: 'Add iteration limits and timeouts to all loops.',
        };
      }
      return null;
    },
  },
  {
    id: 'E',
    category: 'Elevation of Privilege',
    check: (code: string): SecurityFinding | null => {
      if (/sudo|root|admin.*bypass|privilege.*escalat/gi.test(code)) {
        return {
          id: 'E',
          framework: 'STRIDE',
          category: 'Elevation of Privilege',
          title: 'Privilege escalation risk',
          severity: 'critical',
          description: 'Code references privileged operations that could be exploited.',
          remediation: 'Use least-privilege principle. Never run as root. Use proper RBAC.',
        };
      }
      return null;
    },
  },
];

// ── Auditor ─────────────────────────────────────────────────────────────

export class SecurityAuditor {
  /**
   * Run all OWASP and STRIDE checks against a code string.
   */
  audit(code: string, scope: string = 'unknown'): AuditReport {
    const findings: SecurityFinding[] = [];

    // Run OWASP checks
    for (const check of OWASP_CHECKS) {
      const finding = check.check(code);
      if (finding) findings.push(finding);
    }

    // Run STRIDE checks
    for (const check of STRIDE_CHECKS) {
      const finding = check.check(code);
      if (finding) findings.push(finding);
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    const unique = findings.filter(f => {
      if (seen.has(f.id + f.category)) return false;
      seen.add(f.id + f.category);
      return true;
    });

    return {
      timestamp: new Date().toISOString(),
      scope,
      findings: unique,
      summary: {
        critical: unique.filter(f => f.severity === 'critical').length,
        high: unique.filter(f => f.severity === 'high').length,
        medium: unique.filter(f => f.severity === 'medium').length,
        low: unique.filter(f => f.severity === 'low').length,
        info: unique.filter(f => f.severity === 'info').length,
        total: unique.length,
      },
    };
  }

  /**
   * Audit a file by path.
   */
  auditFile(filePath: string): AuditReport {
    const fs = require('fs');
    const code = fs.readFileSync(filePath, 'utf-8');
    return this.audit(code, filePath);
  }

  /**
   * Audit multiple files.
   */
  auditDirectory(dirPath: string, extensions = ['.ts', '.js', '.py']): AuditReport[] {
    const fs = require('fs');
    const path = require('path');
    const reports: AuditReport[] = [];

    const files = fs.readdirSync(dirPath, { recursive: true });
    for (const file of files) {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isFile()) {
          reports.push(this.auditFile(fullPath));
        }
      }
    }

    return reports;
  }

  /**
   * Generate a summary report from multiple audits.
   */
  summarizeReports(reports: AuditReport[]): {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byFramework: Record<string, number>;
    criticalFindings: SecurityFinding[];
  } {
    const allFindings = reports.flatMap(r => r.findings);
    const critical = allFindings.filter(f => f.severity === 'critical');

    return {
      totalFindings: allFindings.length,
      bySeverity: {
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
      },
      byFramework: {
        OWASP: allFindings.filter(f => f.framework === 'OWASP').length,
        STRIDE: allFindings.filter(f => f.framework === 'STRIDE').length,
      },
      criticalFindings: critical,
    };
  }
}
