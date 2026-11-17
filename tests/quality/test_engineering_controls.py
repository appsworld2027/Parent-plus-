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

    def test_subagent_receives_same_repository_instructions(self):
        hook = ROOT / 'scripts/codex_skill_hook.py'
        result = subprocess.run([sys.executable, str(hook)], input=json.dumps({'cwd': str(ROOT), 'hook_event_name': 'SubagentStart'}), text=True, capture_output=True, check=True)
        output = json.loads(result.stdout)['hookSpecificOutput']
        self.assertEqual(output['hookEventName'], 'SubagentStart')
        self.assertIn('Repository AGENTS.md', output['additionalContext'])

    def test_stops_if_skill_check_fails(self):
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

    def test_missing_or_placeholder_task_evidence_is_rejected(self):
        review = {'user': {'login': 'reviewer'}, 'state': 'APPROVED', 'commit_id': 'new'}
        for body in ['', '## Skill and review evidence\nTODO', '## Skill and review evidence\nSkills: <!-- choose -->\nEvidence: <!-- fill -->\nExceptions: <!-- fill -->']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                self.gate.validate({**self.pr, 'body': body}, [review])


if __name__ == '__main__': unittest.main()
