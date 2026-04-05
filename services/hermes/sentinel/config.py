"""
Configuration loader for Sentinel.

Loads and validates all Paperclip YAML config files.
"""

import os
from pathlib import Path
from typing import Optional


def load_yaml(path: str) -> dict:
    """Load a YAML config file."""
    try:
        import yaml
    except ImportError:
        raise ImportError("PyYAML required: pip install pyyaml")
    
    config_path = Path(path)
    if not config_path.exists():
        return {}
    
    with open(config_path) as f:
        return yaml.safe_load(f) or {}


def load_all_configs(config_dir: str = None) -> dict:
    """
    Load all Sentinel config files from the config directory.
    
    Returns:
        Dict with keys: gate, sentinel, canary, decoy, shield
    """
    if config_dir is None:
        # Default to config/ relative to this file
        config_dir = str(Path(__file__).parent.parent / "config")
    
    config_path = Path(config_dir)
    
    configs = {}
    for name in ("gate", "sentinel", "canary", "decoy", "shield"):
        file_path = config_path / f"{name}.yaml"
        configs[name] = load_yaml(str(file_path))
    
    # Merge environment variable overrides
    configs = _apply_env_overrides(configs)
    
    return configs


def _apply_env_overrides(configs: dict) -> dict:
    """Apply environment variable overrides to configs."""
    env_mappings = {
        "SENTINEL_CALLBACK_BASE": ("canary", "callback_base"),
        "DISCORD_SECURITY_WEBHOOK": ("shield", "alert_channels", "discord", "webhook"),
        "SLACK_SECURITY_WEBHOOK": ("shield", "alert_channels", "slack", "webhook"),
        "PAGERDUTY_INTEGRATION_KEY": ("shield", "alert_channels", "pagerduty", "webhook"),
        "SENTINEL_LOG_LEVEL": ("sentinel", "log_level"),
    }
    
    for env_var, config_path in env_mappings.items():
        value = os.environ.get(env_var)
        if value:
            # Navigate to the nested config location
            current = configs
            for key in config_path[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            current[config_path[-1]] = value
    
    return configs


def validate_config(config: dict) -> list[str]:
    """
    Validate a Sentinel configuration.
    Returns list of validation errors (empty = valid).
    """
    errors = []
    
    # Gate validation
    gate = config.get("gate", {})
    if gate.get("rate_limiting", {}).get("requests_per_minute", 0) <= 0:
        errors.append("gate.rate_limiting.requests_per_minute must be > 0")
    
    # Sentinel validation
    sentinel = config.get("sentinel", {})
    if not sentinel.get("injection_signatures"):
        errors.append("sentinel.injection_signatures is empty — no injection detection")
    
    # Canary validation
    canary = config.get("canary", {})
    if not canary.get("callback_base"):
        errors.append("canary.callback_base not set — canary URLs won't work")
    
    # Shield validation
    shield = config.get("shield", {})
    channels = shield.get("alert_channels", {})
    if not channels:
        errors.append("shield.alert_channels is empty — no alerting configured")
    
    return errors
