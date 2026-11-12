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


# The Windows Intel emulator and current ARM64 phones need different native code.
# Check actual packaged ELF headers, not just the Gradle architecture argument.
def verify_apk_architectures(apk, expected=('arm64-v8a', 'x86_64')):
    import zipfile
    machines = {'arm64-v8a': 183, 'x86_64': 62}
    expected = set(expected)
    if not expected or not expected.issubset(machines):
        raise ValueError('Unsupported preview architecture')
    with zipfile.ZipFile(apk) as archive:
        libraries = {}
        for name in archive.namelist():
            parts = name.split('/')
            if len(parts) == 3 and parts[0] == 'lib' and parts[2].endswith('.so'):
                libraries.setdefault(parts[1], []).append(name)
        if set(libraries) != expected:
            raise RuntimeError(f'APK native architectures do not match: expected {sorted(expected)}, found {sorted(libraries)}')
        for abi, names in libraries.items():
            for name in names:
                with archive.open(name) as native:
                    header = native.read(20)
                if len(header) < 20 or header[:6] != b'\x7fELF\x02\x01' or int.from_bytes(header[18:20], 'little') != machines[abi]:
                    raise RuntimeError(f'Native library has an invalid {abi} ELF header: {name}')
        return {abi: len(libraries[abi]) for abi in sorted(expected)}
