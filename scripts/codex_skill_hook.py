"""Project-local Codex hook: check pinned skills and supply task guidance."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_SHA256 = '61e24b1040e6427fbfd0f186fb369a9eff8e9634c13102c02cdfaabc66df35c3'
REMINDER = ("Assess the user's task yourself and read/apply relevant Superpowers skills "
            'before the associated work; reassess when the task changes. '
            'Record skills, validation, unavailable steps and independent review honestly. '
            'A skill-file check or self-attestation does not prove skill adherence.')


def verified_skills():
    manifest_bytes = (ROOT / 'quality/superpowers-manifest.json').read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA256:
        raise ValueError('Pinned Superpowers manifest changed; review and renew hook trust')
    manifest = json.loads(manifest_bytes)
    files = manifest.get('files')
    if not isinstance(files, dict) or not files:
        raise ValueError('Superpowers manifest has no files')
    verified = {}
    prefix = ROOT / '.agents/skills'
    for name, expected in files.items():
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or not relative.is_relative_to('.agents/skills'):
            raise ValueError('Invalid Superpowers file path')
        path = ROOT / relative
        if path.resolve() != path or not path.is_file() or not path.is_relative_to(prefix):
            raise ValueError(f'Superpowers file missing or unsafe: {name}')
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != expected:
            raise ValueError(f'Superpowers file changed: {name}')
        verified[name] = content
    return verified


def skill_catalog(verified):
    paths = sorted(name for name in verified if name.endswith('/SKILL.md'))
    if '.agents/skills/using-superpowers/SKILL.md' not in paths:
        raise ValueError('Superpowers bootstrap skill missing')
    entries = []
    for path in paths:
        content = verified[path].decode('utf-8').splitlines()
        if not content or content[0] != '---' or '---' not in content[1:]:
            raise ValueError(f'Invalid skill metadata: {path}')
        metadata = content[1:content[1:].index('---') + 1]
        fields = dict(line.split(':', 1) for line in metadata if line.startswith(('name:', 'description:')))
        name = fields.get('name', '').strip().strip('"').strip("'")
        description = fields.get('description', '').strip().strip('"').strip("'")
        if name != Path(path).parent.name or not description or description in ('>', '|', '>-', '|-'):
            raise ValueError(f'Invalid skill metadata: {path}')
        entries.append(f'- {name}: {description} (read {path})')
    return '\n'.join(entries)


def main():
    try:
        event = json.load(sys.stdin)
        name = event['hook_event_name']
        if name not in ('SessionStart', 'SubagentStart', 'UserPromptSubmit'):
            raise ValueError('Unsupported hook event')
        cwd = Path(event['cwd']).resolve(strict=True)
        actual = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=cwd, check=True, capture_output=True, text=True)
        if Path(actual.stdout.strip()).resolve() != ROOT:
            raise ValueError('Session is not in this ParentPlus checkout')
        instructions = (ROOT / 'AGENTS.md').read_text()
        verified = verified_skills()
        context = REMINDER + "\n\nAvailable Superpowers skills (select by task, no user trigger required):\n" + skill_catalog(verified)
        if name in ('SessionStart', 'SubagentStart'):
            context += '\n\nRepository AGENTS.md:\n' + instructions
        response = {'hookSpecificOutput': {'hookEventName': name, 'additionalContext': context}}
    except (ValueError, KeyError, OSError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        reason = 'ParentPlus startup check failed: ' + str(error)
        response = {'continue': False, 'stopReason': reason, 'systemMessage': reason}
        if 'name' in locals() and name == 'SubagentStart':
            response['hookSpecificOutput'] = {'hookEventName': name, 'additionalContext': reason + '. Stop and report this failure; do not claim the skill check passed.'}
    print(json.dumps(response))


if __name__ == '__main__': main()
