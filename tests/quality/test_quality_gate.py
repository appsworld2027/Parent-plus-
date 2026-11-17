import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('quality_gate', Path(__file__).resolve().parents[2] / 'scripts/quality_gate.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class EvidenceTests(unittest.TestCase):
    def report(self, xml, expected=('tests/a.test.ts::works',)):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'report.xml'
            path.write_text(xml)
            return gate.validate_junit(path, set(expected))

    def test_accepts_exact_successful_case(self):
        self.assertEqual(self.report('<testsuites><testsuite><testcase classname="tests/a.test.ts" name="works"/></testsuite></testsuites>'), 1)

    def test_rejects_empty_failure_error_and_skipped(self):
        for body in ['', '<failure/>', '<error/>', '<skipped/>']:
            xml = '<testsuites/>' if not body else f'<testsuites><testcase classname="tests/a.test.ts" name="works">{body}</testcase></testsuites>'
            with self.subTest(body=body), self.assertRaises(ValueError): self.report(xml)

    def test_rejects_missing_extra_duplicate_or_renamed_tests(self):
        case = '<testcase classname="tests/a.test.ts" name="works"/>'
        for body in [case + case, case.replace('works', 'different'), case + case.replace('works', 'extra')]:
            with self.subTest(body=body), self.assertRaises(ValueError): self.report(f'<testsuites>{body}</testsuites>')

    def test_rejects_invalid_xml_root_and_missing_file(self):
        with self.assertRaises(ValueError): self.report('<root/>')
        with self.assertRaises(ValueError): gate.validate_junit(Path('/nonexistent-parentplus-evidence.xml'), {'case'})

    def test_requires_fresh_matching_execution_input(self):
        gate.require_fingerprint('same', 'same')
        with self.assertRaises(ValueError): gate.require_fingerprint('old', 'new')

    def test_rejects_stale_report_and_declared_summary_failures(self):
        gate.require_report_freshness(101, 100)
        with self.assertRaises(ValueError): gate.require_report_freshness(99, 100)
        with self.assertRaises(ValueError): self.report('<testsuites failures="1"><testcase classname="tests/a.test.ts" name="works"/></testsuites>')

    def test_registry_cannot_hide_unmapped_cases_or_claim_planned_coverage(self):
        row = {'id': 'S1', 'status': 'implemented', 'criteria': 'observable result', 'tests': ['tests/a.test.ts::works']}
        gate.validate_registry([row], {'tests/a.test.ts::works'})
        for rows, cases in [([], {'case'}), ([row, row], set(row['tests'])), ([{**row, 'status': 'planned'}], set(row['tests'])), ([row], {'extra'})]:
            with self.subTest(rows=rows), self.assertRaises(ValueError): gate.validate_registry(rows, cases)


if __name__ == '__main__': unittest.main()
