"""
Prompt Watermarking — Trace exfiltrated content.

Embeds invisible watermarks into system prompts per-session.
If a prompt leaks externally, we can trace it back to the
specific session where the leak occurred.
"""

import hashlib
import secrets
import re
from typing import Optional


class PromptWatermark:
    """
    Watermarking strategies:
    
    1. Zero-width character injection
       - Embed session ID as zero-width chars between sentences
       - Invisible in rendered output, detectable in raw text
    
    2. Semantic watermarking
       - Use specific word choices that vary per session
       - e.g., "Your primary goal" vs "Your main objective"
       - Detectable even if zero-width chars are stripped
    
    3. Structural watermarking
       - Vary whitespace, line breaks, or punctuation subtly
       - Unique pattern per session
    """
    
    # Zero-width characters for encoding
    ZWC_ZERO = "\u200b"  # Zero-width space
    ZWC_ONE = "\u200c"   # Zero-width non-joiner
    
    # Semantic alternatives — each pair is interchangeable
    SEMANTIC_PAIRS = [
        ("Your primary goal", "Your main objective"),
        ("You should", "You must"),
        ("In this context", "For this purpose"),
        ("Always remember", "Never forget"),
        ("The user", "The human"),
        ("It is important", "It is critical"),
        ("You are able to", "You can"),
        ("In order to", "To"),
        ("Make sure to", "Ensure you"),
        ("Please note that", "Be aware that"),
    ]
    
    def __init__(self):
        self._session_watermarks: dict[str, dict] = {}
    
    def watermark_prompt(self, base_prompt: str, session_id: str) -> str:
        """
        Add watermarks to a system prompt for a specific session.
        
        Returns the watermarked prompt. The watermarks are invisible
        to the LLM and don't affect behavior, but are detectable
        if the prompt is exfiltrated.
        """
        watermarked = base_prompt
        
        # Strategy 1: Zero-width encoding
        zwc_watermark = self._encode_session_zwc(session_id)
        watermarked = self._inject_zwc(watermarked, zwc_watermark)
        
        # Strategy 2: Semantic watermark
        semantic_seed = int(hashlib.sha256(session_id.encode()).hexdigest()[:8], 16)
        watermarked = self._apply_semantic_watermark(watermarked, semantic_seed)
        
        # Store watermark info for detection
        self._session_watermarks[session_id] = {
            "zwc_pattern": zwc_watermark,
            "semantic_seed": semantic_seed,
            "ngram_hashes": self._compute_ngram_hashes(base_prompt),
        }
        
        return watermarked
    
    def detect_watermark(self, leaked_text: str) -> Optional[dict]:
        """
        Check if leaked text contains a watermark.
        Returns session info if found, None otherwise.
        """
        # Check zero-width characters
        zwc_session = self._detect_zwc(leaked_text)
        if zwc_session:
            return {"session_id": zwc_session, "method": "zero_width"}
        
        # Check semantic watermark
        semantic_session = self._detect_semantic(leaked_text)
        if semantic_session:
            return {"session_id": semantic_session, "method": "semantic"}
        
        # Check n-gram fingerprint
        ngram_session = self._detect_ngram(leaked_text)
        if ngram_session:
            return {"session_id": ngram_session, "method": "ngram"}
        
        return None
    
    def _encode_session_zwc(self, session_id: str) -> str:
        """Encode session ID as a sequence of zero-width chars."""
        # Convert session ID to binary
        binary = bin(int(hashlib.sha256(session_id.encode()).hexdigest()[:16], 16))[2:]
        # Encode as ZWC sequence
        return "".join(
            self.ZWC_ONE if bit == "1" else self.ZWC_ZERO
            for bit in binary[:32]  # Use first 32 bits
        )
    
    def _inject_zwc(self, text: str, zwc_watermark: str) -> str:
        """Inject zero-width watermark into text at sentence boundaries."""
        # Insert after the first sentence-ending period
        match = re.search(r'\.\s', text)
        if match:
            pos = match.end()
            return text[:pos] + zwc_watermark + text[pos:]
        # Fallback: append at end
        return text + zwc_watermark
    
    def _apply_semantic_watermark(self, text: str, seed: int) -> str:
        """Apply semantic watermarking using seed-based word choices."""
        watermarked = text
        for i, (option_a, option_b) in enumerate(self.SEMANTIC_PAIRS):
            # Use seed bit to choose which option to prefer
            bit = (seed >> (i % 32)) & 1
            preferred = option_a if bit == 0 else option_b
            alternate = option_b if bit == 0 else option_a
            
            # If the text already uses the alternate, swap to preferred
            watermarked = watermarked.replace(alternate, preferred)
        
        return watermarked
    
    def _detect_zwc(self, text: str) -> Optional[str]:
        """Detect zero-width watermark in text."""
        # Extract ZWC sequence
        zwc_chars = re.findall(f"[{self.ZWC_ZERO}{self.ZWC_ONE}]+", text)
        if not zwc_chars:
            return None
        
        # Convert back to binary
        binary = "".join(
            "1" if c == self.ZWC_ONE else "0"
            for c in zwc_chars[0][:32]
        )
        
        if len(binary) < 32:
            return None
        
        # Check against known sessions
        for session_id, watermark_info in self._session_watermarks.items():
            if watermark_info["zwc_pattern"][:32] == zwc_chars[0][:32]:
                return session_id
        
        return None
    
    def _detect_semantic(self, text: str) -> Optional[str]:
        """Detect semantic watermark in text."""
        # Build a fingerprint of which semantic options are used
        fingerprint = []
        for i, (option_a, option_b) in enumerate(self.SEMANTIC_PAIRS):
            if option_a in text:
                fingerprint.append(0)
            elif option_b in text:
                fingerprint.append(1)
        
        if len(fingerprint) < 3:
            return None
        
        # Reconstruct seed from fingerprint
        seed = 0
        for i, bit in enumerate(fingerprint):
            seed |= (bit << (i % 32))
        
        # Check against known sessions
        for session_id, watermark_info in self._session_watermarks.items():
            if watermark_info["semantic_seed"] == seed:
                return session_id
        
        return None
    
    def _compute_ngram_hashes(self, text: str, n: int = 5) -> set:
        """Compute hashes of n-grams for fingerprint detection."""
        words = text.lower().split()
        ngrams = [" ".join(words[i:i+n]) for i in range(len(words) - n + 1)]
        return {hashlib.sha256(ng.encode()).hexdigest()[:16] for ng in ngrams}
    
    def _detect_ngram(self, text: str) -> Optional[str]:
        """Detect session via n-gram matching."""
        text_hashes = self._compute_ngram_hashes(text)
        
        best_match = None
        best_overlap = 0
        
        for session_id, watermark_info in self._session_watermarks.items():
            overlap = len(text_hashes & watermark_info["ngram_hashes"])
            if overlap > best_overlap:
                best_overlap = overlap
                best_match = session_id
        
        if best_overlap >= 3:  # 3+ matching 5-grams
            return best_match
        
        return None
