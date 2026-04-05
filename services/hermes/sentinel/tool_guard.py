"""
Layer 2b: Tool Guard — Tool execution safety.

Detects dangerous tool combinations, enforces sandbox boundaries,
and prevents data exfiltration via tool chaining.
"""

import re
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class ToolCall:
    """Represents a single tool call for analysis."""
    tool_name: str
    arguments: dict
    timestamp: float
    session_id: str
    agent_id: str = ""


@dataclass
class GuardResult:
    """Result of tool guard evaluation."""
    allowed: bool = True
    severity: str = "info"
    reason: str = ""
    requires_approval: bool = False
    blocked_chain: bool = False


class ToolGuard:
    """
    Monitors tool calls for dangerous patterns.
    
    Features:
      1. Dangerous tool combination detection
      2. File access boundary enforcement
      3. Network access restrictions
      4. Terminal command filtering
      5. Tool call sequence analysis (chain detection)
    """
    
    # Dangerous tool combos — (name, tools, context, severity)
    DANGEROUS_COMBOS = [
        (
            "data_exfil",
            ["read_file", "web_fetch"],
            "Reading files and making external requests — potential exfiltration",
            "critical",
        ),
        (
            "data_exfil_search",
            ["read_file", "web_search"],
            "Reading files and searching web — potential exfiltration",
            "high",
        ),
        (
            "shell_escalation",
            ["read_file", "execute_code"],
            "Reading auth files then executing code — potential escalation",
            "critical",
        ),
        (
            "config_tamper_exec",
            ["write_file", "execute_code"],
            "Writing files then executing code — potential persistence",
            "high",
        ),
    ]
    
    # Denied file paths (absolute or glob patterns)
    DENY_PATHS = [
        "/etc/shadow",
        "/etc/passwd",
        "~/.ssh/",
        "~/.aws/",
        "~/.hermes/.env",
        "~/.gnupg/",
        "~/.config/gcloud/",
        "*credentials*",
        "*secrets*",
    ]
    
    # Denied terminal commands (regex patterns)
    DENY_COMMANDS = [
        r"curl\s+.*\|\s*(ba)?sh",
        r"wget\s+.*\|\s*(ba)?sh",
        r"rm\s+-rf\s+/",
        r"chmod\s+777",
        r"nc\s+-l",                      # Netcat listener (reverse shell)
        r"python\s+-c.*socket",           # Python socket backdoor
        r"bash\s+-i\s+>&\s*/dev/tcp",    # Bash reverse shell
        r"mkfifo.*nc\s",                  # Named pipe + netcat
        r">\s*/dev/tcp/",                 # Bash /dev/tcp redirect
        r"eval\s*\(\s*base64",           # Eval of base64 encoded code
    ]
    
    def __init__(self, config: dict):
        self.config = config
        self._compiled_deny_commands = [
            re.compile(p, re.IGNORECASE) for p in self.DENY_COMMANDS
        ]
        
        # Tool call history per session for chain detection
        self._history: dict[str, list[ToolCall]] = {}
        
        # Configurable limits
        sandbox_config = config.get("sandbox", {})
        file_config = sandbox_config.get("file_access", {})
        self._deny_paths = file_config.get("deny_paths", self.DENY_PATHS)
        self._allow_paths = file_config.get("allow_paths", [])
    
    def check_tool_call(self, call: ToolCall) -> GuardResult:
        """
        Evaluate a single tool call against all guard rules.
        Call this BEFORE executing the tool.
        """
        # 1. Check if tool is globally disabled
        if self._is_tool_disabled(call.tool_name):
            return GuardResult(
                allowed=False,
                severity="warning",
                reason=f"Tool '{call.tool_name}' is disabled by policy",
            )
        
        # 2. File access checks
        if call.tool_name in ("read_file", "write_file", "patch", "search_files"):
            result = self._check_file_access(call)
            if not result.allowed:
                return result
        
        # 3. Terminal command checks
        if call.tool_name in ("terminal", "execute_code"):
            result = self._check_terminal_safety(call)
            if not result.allowed:
                return result
        
        # 4. Network access checks
        if call.tool_name in ("web_fetch", "web_search", "browser_navigate"):
            result = self._check_network_access(call)
            if not result.allowed:
                return result
        
        # 4.5 Check sudo before recording
        requires_approval = False
        if call.tool_name in ("terminal", "execute_code"):
            command = call.arguments.get("command", "")
            if command.strip().startswith("sudo"):
                requires_approval = True

        # 5. Record in history and check for dangerous chains
        self._record_call(call)
        chain_result = self._check_chain(call.session_id)
        if not chain_result.allowed:
            return chain_result
        
        return GuardResult(allowed=True, severity="info", reason="OK",
                           requires_approval=requires_approval)
    
    def _check_file_access(self, call: ToolCall) -> GuardResult:
        """Check if file path is within allowed boundaries."""
        path = call.arguments.get("path", "")
        
        # Check deny list
        for deny in self._deny_paths:
            if self._path_matches(path, deny):
                return GuardResult(
                    allowed=False,
                    severity="critical",
                    reason=f"File access denied: '{path}' matches deny pattern '{deny}'",
                )
        
        # If allow list is set, path must match at least one
        if self._allow_paths:
            allowed = any(self._path_matches(path, a) for a in self._allow_paths)
            if not allowed:
                return GuardResult(
                    allowed=False,
                    severity="warning",
                    reason=f"File path '{path}' not in allowed paths",
                )
        
        return GuardResult(allowed=True)
    
    def _check_terminal_safety(self, call: ToolCall) -> GuardResult:
        """Check terminal/execute commands against deny list."""
        command = call.arguments.get("command", "")
        
        for pattern in self._compiled_deny_commands:
            if pattern.search(command):
                return GuardResult(
                    allowed=False,
                    severity="critical",
                    reason=f"Terminal command blocked by safety rule: '{command}'",
                    requires_approval=True,
                )
        
        # Check for sudo
        if command.strip().startswith("sudo"):
            return GuardResult(
                allowed=True,  # Allow but require approval
                severity="warning",
                reason="Sudo command detected — requires approval",
                requires_approval=True,
            )
        
        return GuardResult(allowed=True)
    
    def _check_network_access(self, call: ToolCall) -> GuardResult:
        """Check if network request is to an allowed destination."""
        url = call.arguments.get("url", "")
        
        # Check for internal network access
        internal_patterns = [
            r"https?://10\.",
            r"https?://172\.(1[6-9]|2\d|3[01])\.",
            r"https?://192\.168\.",
            r"https?://localhost",
            r"https?://127\.",
            r"https?://0\.0\.0\.0",
        ]
        
        for pattern in internal_patterns:
            if re.search(pattern, url):
                return GuardResult(
                    allowed=False,
                    severity="critical",
                    reason=f"Internal network access blocked: {url}",
                )
        
        return GuardResult(allowed=True)
    
    def _check_chain(self, session_id: str) -> GuardResult:
        """Check recent tool calls for dangerous combinations."""
        history = self._history.get(session_id, [])
        if len(history) < 2:
            return GuardResult(allowed=True)
        
        # Check last 5 calls for dangerous combos
        recent = [c.tool_name for c in history[-5:]]
        
        for combo_name, combo_tools, context, severity in self.DANGEROUS_COMBOS:
            if all(tool in recent for tool in combo_tools):
                # Check if calls happened within 60 seconds
                combo_calls = [c for c in history[-5:] if c.tool_name in combo_tools]
                if combo_calls and (combo_calls[-1].timestamp - combo_calls[0].timestamp) < 60:
                    return GuardResult(
                        allowed=False,
                        severity=severity,
                        reason=f"Dangerous tool chain detected: {combo_name} — {context}",
                        blocked_chain=True,
                    )
        
        return GuardResult(allowed=True)
    
    def _record_call(self, call: ToolCall):
        """Record a tool call in session history."""
        if call.session_id not in self._history:
            self._history[call.session_id] = []
        self._history[call.session_id].append(call)
        
        # Keep only last 50 calls per session
        if len(self._history[call.session_id]) > 50:
            self._history[call.session_id] = self._history[call.session_id][-50:]
    
    def _is_tool_disabled(self, tool_name: str) -> bool:
        """Check if a tool is globally disabled."""
        disabled = self.config.get("disabled_tools", [])
        return tool_name in disabled
    
    def _path_matches(self, path: str, pattern: str) -> bool:
        """Check if a path matches a pattern (supports * wildcards)."""
        import fnmatch
        # Normalize home directory
        path = path.replace("~", "/home/user")
        pattern = pattern.replace("~", "/home/user")
        return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, pattern + "*")
    
    def get_session_history(self, session_id: str) -> list[dict]:
        """Get tool call history for a session."""
        calls = self._history.get(session_id, [])
        return [
            {
                "tool": c.tool_name,
                "args": c.arguments,
                "timestamp": c.timestamp,
            }
            for c in calls
        ]
