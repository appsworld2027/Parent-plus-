"""Project-local Codex hook: check pinned skills and supply task guidance."""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REMINDER = ("Assess the user's task yourself and read/apply relevant Superpowers skills "
            'before the associated work; reassess when the task changes. '
            'Record skills, validation, unavailable steps and independent review honestly. '
            'A skill-file check or self-attestation does not prove skill adherence.')


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
        result = subprocess.run([sys.executable, str(ROOT / 'scripts/quality_gate.py'), 'skills'], cwd=ROOT, capture_output=True, text=True)
        if result.returncode:
            raise ValueError('Pinned Superpowers file check failed: ' + (result.stderr or result.stdout).strip()[:1000])
        context = REMINDER
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
