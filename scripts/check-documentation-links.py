"""Check static local documentation links; external URLs need separate online checks."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PATTERN = re.compile(
    r'!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+[^)]*)?\)'
    r'|(?:href|src)=[\"\']([^\"\']+)[\"\']'
    r'|^\s*\[[^\]]+\]:\s*(\S+)', re.M)


def main():
    files = list(ROOT.glob('*.md'))
    for folder in ('docs', 'founders', 'ai-workspace'):
        files.extend(p for p in (ROOT / folder).rglob('*') if p.suffix in ('.md', '.html'))
    errors, checked = [], 0
    for source in sorted(set(files)):
        text = source.read_text()
        # Sample code is illustrative, not navigation. Prototype templates have
        # dynamic asset URLs that can only be resolved by their JavaScript.
        text = re.sub(r'^(```|~~~).*?^\1[^\n]*$', '', text, flags=re.M | re.S)
        text = re.sub(r'`[^`\n]*`', '', text)
        for match in PATTERN.finditer(text):
            target = next(part for part in match.groups() if part).strip('<>')
            if re.match(r'^(?:[a-zA-Z][\w+.-]*:|//|#)', target) or '${' in target:
                continue
            path = target.split('#', 1)[0].split('?', 1)[0]
            if not path:
                continue
            checked += 1
            destination = (ROOT / path.lstrip('/')) if path.startswith('/') else (source.parent / path)
            if not destination.exists():
                errors.append(f'{source.relative_to(ROOT)}: {target}')
    print(f'Checked {checked} static local document/image targets; {len(errors)} missing.')
    for error in errors:
        print(error)
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
