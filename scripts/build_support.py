"""Small, side-effect-free helpers for safe build diagnostics."""
import re
from urllib.parse import urlsplit, urlunsplit

def sanitize_build_line(line):
    # Build logs never contain app records; additionally strip keys/tokens and
    # signed URL queries before retaining an error tail for remote diagnosis.
    line = re.sub(r'\x1b\[[0-9;]*m', '', line)
    line = re.sub(r'sb_(?:publishable|secret)_[A-Za-z0-9_-]+', '[redacted key]', line)
    line = re.sub(r'(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]+', '[redacted token]', line)
    line = re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[redacted token]', line)
    line = re.sub(r'(?i)(authorization\s*[:=]\s*)\S+(?:\s+\S+)?', r'\1[redacted]', line)
    def strip_query(match):
        value = urlsplit(match.group(0))
        return urlunsplit((value.scheme, value.hostname or '', value.path, '', ''))
    return re.sub(r'https?://[^\s<>]+', strip_query, line).rstrip()[:350]

