import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def module(path):
    spec = importlib.util.spec_from_file_location('engineering_review', ROOT / path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


class StartupHookTests(unittest.TestCase):
    def test_reports_skill_check_and_task_reminder_without_logging_prompt(self):
        hook = ROOT / 'scripts/codex_skill_hook.py'
        result = subprocess.run([sys.executable, str(hook)], input=json.dumps({'cwd': str(ROOT), 'hook_event_name': 'UserPromptSubmit', 'prompt': 'private prompt'}), text=True, capture_output=True, check=True)
        output = json.loads(result.stdout)
        self.assertTrue(output.get('continue', True))
        self.assertIn('skill', output['hookSpecificOutput']['additionalContext'].lower())
        self.assertNotIn('private prompt', result.stdout + result.stderr)

    def test_each_task_includes_skill_descriptions_for_automatic_selection(self):
        hook = ROOT / 'scripts/codex_skill_hook.py'
        event = {'cwd': str(ROOT), 'hook_event_name': 'UserPromptSubmit', 'prompt': 'fix a failing test'}
        result = subprocess.run([sys.executable, str(hook)], input=json.dumps(event), text=True, capture_output=True, check=True)
        context = json.loads(result.stdout)['hookSpecificOutput']['additionalContext']
        self.assertIn('systematic-debugging', context)
        self.assertIn('test-driven-development', context)
        self.assertIn('verification-before-completion', context)
        self.assertIn('Use when encountering any bug', context)
        self.assertNotIn(event['prompt'], context)

    def test_subagent_receives_same_repository_instructions(self):
        hook = ROOT / 'scripts/codex_skill_hook.py'
        result = subprocess.run([sys.executable, str(hook)], input=json.dumps({'cwd': str(ROOT), 'hook_event_name': 'SubagentStart'}), text=True, capture_output=True, check=True)
        output = json.loads(result.stdout)['hookSpecificOutput']
        self.assertEqual(output['hookEventName'], 'SubagentStart')
        self.assertIn('Repository AGENTS.md', output['additionalContext'])

    def test_hook_launcher_refuses_to_execute_a_changed_script(self):
        config = json.loads((ROOT / '.codex/hooks.json').read_text())
        command = config['hooks']['SessionStart'][0]['hooks'][0]['command']
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/codex_skill_hook.py').write_text('print("UNTRUSTED_SCRIPT_EXECUTED")\n')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            result = subprocess.run(command, cwd=root, shell=True, input=json.dumps({'cwd': tmp, 'hook_event_name': 'SessionStart'}), text=True, capture_output=True)
            self.assertNotIn('UNTRUSTED_SCRIPT_EXECUTED', result.stdout)
            self.assertIn('"continue": false', result.stdout)

    def test_launcher_reports_missing_script_to_subagent(self):
        config = json.loads((ROOT / '.codex/hooks.json').read_text())
        command = config['hooks']['SubagentStart'][0]['hooks'][0]['command']
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(['git', 'init', '-q', tmp], check=True)
            result = subprocess.run(command, cwd=tmp, shell=True, input=json.dumps({'cwd': tmp, 'hook_event_name': 'SubagentStart'}), text=True, capture_output=True, check=True)
            output = json.loads(result.stdout)
            self.assertFalse(output['continue'])
            self.assertIn('Stop and report', output['hookSpecificOutput']['additionalContext'])

    def test_hook_rejects_a_changed_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'quality').mkdir()
            shutil.copy(ROOT / 'scripts/codex_skill_hook.py', root / 'scripts')
            (root / 'quality/superpowers-manifest.json').write_text('{}')
            (root / 'AGENTS.md').write_text('instructions')
            subprocess.run(['git', 'init', '-q', tmp], check=True)
            result = subprocess.run([sys.executable, str(root / 'scripts/codex_skill_hook.py')], input=json.dumps({'cwd': tmp, 'hook_event_name': 'SessionStart'}), text=True, capture_output=True, check=True)
            output = json.loads(result.stdout)
            self.assertFalse(output['continue'])
            self.assertIn('manifest changed', output['stopReason'])

    def test_changed_pinned_skill_is_reported_to_subagent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'quality').mkdir()
            (root / '.agents').mkdir()
            shutil.copy(ROOT / 'scripts/codex_skill_hook.py', root / 'scripts')
            shutil.copy(ROOT / 'quality/superpowers-manifest.json', root / 'quality')
            shutil.copytree(ROOT / '.agents/skills', root / '.agents/skills')
            target = root / '.agents/skills/using-superpowers/SKILL.md'
            target.write_bytes(target.read_bytes() + b'\nchanged')
            (root / 'AGENTS.md').write_text('instructions')
            subprocess.run(['git', 'init', '-q', tmp], check=True)
            result = subprocess.run([sys.executable, str(root / 'scripts/codex_skill_hook.py')], input=json.dumps({'cwd': tmp, 'hook_event_name': 'SubagentStart'}), text=True, capture_output=True, check=True)
            output = json.loads(result.stdout)
            self.assertFalse(output['continue'])
            self.assertIn('Superpowers file changed', output['stopReason'])
            self.assertIn('Stop and report', output['hookSpecificOutput']['additionalContext'])

    def test_hook_does_not_execute_a_changed_quality_checker(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            shutil.copy(ROOT / 'scripts/codex_skill_hook.py', root / 'scripts')
            marker = root / 'executed'
            (root / 'scripts/quality_gate.py').write_text('from pathlib import Path\nPath('+repr(str(marker))+').write_text("executed")\n')
            (root / 'AGENTS.md').write_text('instructions')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            result = subprocess.run([sys.executable, str(root / 'scripts/codex_skill_hook.py')], input=json.dumps({'cwd': str(root), 'hook_event_name': 'SessionStart'}), text=True, capture_output=True, check=True)
            self.assertFalse(marker.exists())
            self.assertFalse(json.loads(result.stdout)['continue'])

    def test_stops_if_pinned_manifest_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            shutil.copy(ROOT / 'scripts/codex_skill_hook.py', root / 'scripts')
            (root / 'scripts/quality_gate.py').write_text('raise SystemExit(1)\n')
            (root / 'AGENTS.md').write_text('instructions')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            result = subprocess.run([sys.executable, str(root / 'scripts/codex_skill_hook.py')], input=json.dumps({'cwd': str(root), 'hook_event_name': 'SessionStart'}), text=True, capture_output=True, check=True)
            self.assertFalse(json.loads(result.stdout)['continue'])


class ReviewGateTests(unittest.TestCase):
    def setUp(self):
        self.gate = module('scripts/engineering_review_gate.py')
        self.pr = {'user': {'login': 'author'}, 'head': {'sha': 'new'}, 'body': '## Skill and review evidence\nSkills: verification-before-completion\nEvidence: tests passed; independent review requested.\nExceptions: none.'}

    def test_needs_an_independent_approval_for_current_commit(self):
        def review(user, state, sha='new'):
            return {'user': {'login': user}, 'state': state, 'commit_id': sha}
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [])
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [review('author', 'APPROVED')])
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [review('reviewer', 'APPROVED', 'old')])
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [review('reviewer', 'APPROVED'), review('reviewer', 'CHANGES_REQUESTED')])
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [review('reviewer', 'APPROVED'), review('reviewer', 'DISMISSED')])
        with self.assertRaises(ValueError): self.gate.validate(self.pr, [review('reviewer', 'APPROVED'), review('other', 'CHANGES_REQUESTED')])
        self.gate.validate(self.pr, [review('reviewer', 'APPROVED')])

    def test_rejects_event_for_a_different_head(self):
        settings = {'GITHUB_REPOSITORY': 'owner/repo', 'PR_NUMBER': '1',
                    'GITHUB_TOKEN': 'fictional-test-token', 'EXPECTED_HEAD_SHA': 'old'}
        with patch.dict(os.environ, settings), patch.object(self.gate, 'fetch', return_value=self.pr):
            with self.assertRaisesRegex(ValueError, 'triggering event'):
                self.gate.main()

    def test_no_skills_or_evidence_is_not_accepted(self):
        review = {'user': {'login': 'reviewer'}, 'state': 'APPROVED', 'commit_id': 'new'}
        for field in ('Skills: verification-before-completion', 'Evidence: tests passed; independent review requested.'):
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.gate.validate({**self.pr, 'body': self.pr['body'].replace(field, field.split(':')[0] + ': none')}, [review])

    def test_missing_or_placeholder_task_evidence_is_rejected(self):
        review = {'user': {'login': 'reviewer'}, 'state': 'APPROVED', 'commit_id': 'new'}
        for body in ['', '## Skill and review evidence\nTODO', '## Skill and review evidence\nSkills: <!-- choose -->\nEvidence: <!-- fill -->\nExceptions: <!-- fill -->']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.gate.validate({**self.pr, 'body': body}, [review])


if __name__ == '__main__': unittest.main()
