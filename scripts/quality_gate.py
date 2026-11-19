"""Destination-only deterministic evidence gate. Never calls hosted providers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results/quality'


def command(args):
    subprocess.run(args, cwd=ROOT, check=True)


def source_fingerprint():
    files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    digest = hashlib.sha256()
    for name in sorted(set(files) - {''}):
        # Human progress/evidence prose can be updated after an execution. The
        # fingerprint binds executable/config/test/asset inputs, not all prose.
        if name.endswith('.md'): continue
        path = ROOT / name
        if path.is_symlink(): raise ValueError(f'Symlink unsupported: {name}')
        digest.update(name.encode() + b'\0')
        digest.update(path.read_bytes() if path.is_file() else b'DELETED')
        digest.update(str(path.stat().st_mode & 0o111).encode() if path.exists() else b'')
    return digest.hexdigest()


def validate_skill_installation(root, manifest):
    files = manifest.get('files')
    if not isinstance(files, dict) or not files:
        raise ValueError('Superpowers manifest has no files')
    prefix = Path('.agents/skills')
    for name, expected in files.items():
        path = Path(name)
        if path.is_absolute() or '..' in path.parts or not path.is_relative_to(prefix):
            raise ValueError(f'Invalid skill path: {name}')
        file = root / path
        if file.is_symlink() or not file.is_file():
            raise ValueError(f'Superpowers file missing: {name}')
        if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Superpowers file changed: {name}')


def check_skill_installation():
    manifest = json.loads((ROOT / 'quality/superpowers-manifest.json').read_text())
    validate_skill_installation(ROOT, manifest)
    print(f"PASS Superpowers installation: {len(manifest['files'])} pinned files")


def require_fingerprint(expected, actual):
    if not expected or expected != actual: raise ValueError('Execution inputs changed; regenerate the plan and rerun checks')


def require_report_freshness(report_time, plan_time):
    if report_time < plan_time: raise ValueError('Stale report predates this execution plan')


def validate_junit(path, expected):
    if not path.is_file(): raise ValueError(f'Missing evidence: {path}')
    root = ET.parse(path).getroot()
    if root.tag not in ('testsuite', 'testsuites'): raise ValueError('Invalid JUnit root')
    if any(int(node.get(key, '0')) for node in root.iter() for key in ('failures', 'errors', 'skipped')):
        raise ValueError('JUnit summary reports unsuccessful tests')
    cases = list(root.iter('testcase'))
    if not cases or any(list(root.iter(tag)) for tag in ('failure', 'error', 'skipped')):
        raise ValueError('Empty, failing, errored or skipped test evidence')
    actual = []
    for c in cases:
        key = f"{c.get('classname')}::{c.get('name')}"
        for prefix in ('e2e/', 'e2e-apverse/'):
            if key not in expected and prefix + key in expected:
                key = prefix + key
                break
        actual.append(key)
    if len(actual) != len(set(actual)) or set(actual) != expected:
        raise ValueError(f'Test identities do not match collected plan: missing={sorted(expected-set(actual))[:5]}, extra={sorted(set(actual)-expected)[:5]}')
    return len(actual)


def validate_registry(rows, inventory):
    ids, covered = set(), set()
    for row in rows:
        if not row.get('id') or row['id'] in ids or not row.get('criteria'):
            raise ValueError('Missing/duplicate scenario identity or acceptance criteria')
        ids.add(row['id'])
        if row.get('status') != 'implemented' or not row.get('tests'):
            raise ValueError('Execution registry must map narrow implemented scenarios only; future product gaps remain in the roadmap')
        if not set(row['tests']) <= inventory: raise ValueError('Scenario references uncollected test')
        covered.update(row['tests'])
    if covered != inventory: raise ValueError('Unmapped test scenarios; update the reviewed registry')


def collect():
    def output(args): return json.loads(subprocess.check_output(args, cwd=ROOT))
    units = output(['node', 'node_modules/vitest/vitest.mjs', 'list', '--json', '--no-staticParse', '--allowOnly=false'])
    unit_ids = [f"{Path(x['file']).relative_to(ROOT)}::{x['name']}" for x in units]
    def collect_browser(config_args, prefix):
        report = output(['node', 'node_modules/@playwright/test/cli.js', 'test', *config_args, '--list', '--reporter=json'])
        browser_ids = []
        def visit(suite, groups=()):
            for spec in suite.get('specs', []):
                for test in spec['tests']:
                    if test.get('expectedStatus') != 'passed': raise ValueError('Browser test declared skipped/failing')
                title = ' › '.join((*groups, spec['title']))
                browser_ids.append(f"{prefix}{spec['file']}::{title}")
            for child in suite.get('suites', []): visit(child, (*groups, child['title']))
        for suite in report['suites']: visit(suite)
        return browser_ids

    browser_ids = collect_browser([], 'e2e/')
    apverse_browser_ids = collect_browser(['--config=playwright.apverse.config.ts'], 'e2e-apverse/')
    for ids in (unit_ids, browser_ids, apverse_browser_ids):
        if not ids or len(ids) != len(set(ids)): raise ValueError('Empty or duplicate collected identities')
    registry = json.loads((ROOT / 'quality/scenarios.json').read_text())
    validate_registry(registry['scenarios'], set(unit_ids) | set(browser_ids) | set(apverse_browser_ids))
    return {'unit': unit_ids, 'browser': browser_ids, 'apverse_browser': apverse_browser_ids}


def plan():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    check_skill_installation()
    inventory = collect()
    value = {'schema': 1, 'started_ns': time.time_ns(), 'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
             'fingerprint': source_fingerprint(), 'inventory': inventory,
             'selected': ['lint', 'typecheck', 'unit', 'browser', 'apverse-browser', 'web-export'],
             'run_id': os.environ.get('GITHUB_RUN_ID'), 'run_attempt': os.environ.get('GITHUB_RUN_ATTEMPT')}
    (OUTPUT / 'plan.json').write_text(json.dumps(value, indent=2) + '\n')
    print(f"Planned full regression: {len(inventory['unit'])} unit/DB, {len(inventory['browser'])} MM app browser, {len(inventory['apverse_browser'])} APVerse browser scenarios")
    return value


def verify():
    value = json.loads((OUTPUT / 'plan.json').read_text())
    require_fingerprint(value['fingerprint'], source_fingerprint())
    if value.get('run_id') != os.environ.get('GITHUB_RUN_ID') or value.get('run_attempt') != os.environ.get('GITHUB_RUN_ATTEMPT'):
        raise ValueError('Evidence belongs to another CI run/attempt')
    counts = {}
    for suite, ids in value['inventory'].items():
        path = ROOT / f'test-results/{suite}-junit.xml'
        if not path.exists(): raise ValueError(f'Missing report: {path}')
        require_report_freshness(path.stat().st_mtime_ns, value['started_ns'])
        counts[suite] = validate_junit(path, set(ids))
    print(f'PASS exact runtime test identities: {counts}')
    return value, counts


def run():
    # Clear only this gate's reports so old green files cannot satisfy a new run.
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in ('unit-junit.xml', 'browser-junit.xml', 'apverse_browser-junit.xml', 'quality/receipt.json'):
        (ROOT / 'test-results' / name).unlink(missing_ok=True)
    value = plan()
    steps = [
        ['npm', 'run', 'quality:self-test'], ['npm', 'run', 'lint'], ['npm', 'run', 'typecheck'],
        ['npm', 'test', '--', '--allowOnly=false', '--reporter=default', '--reporter=junit', '--outputFile.junit=test-results/unit-junit.xml'],
        ['npm', 'run', 'test:e2e'], ['npm', 'run', 'test:e2e:apverse'], ['npm', 'run', 'export:web'],
    ]
    for step in steps:
        print('RUN', ' '.join(step), flush=True)
        command(step)
        require_fingerprint(value['fingerprint'], source_fingerprint())
        check_skill_installation()
    _, counts = verify()
    receipt = {**value, 'counts': counts, 'commands': steps, 'result': 'passed',
               'reports': {name: hashlib.sha256((ROOT / f'test-results/{name}-junit.xml').read_bytes()).hexdigest() for name in value['inventory']}}
    (OUTPUT / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print('PASS full build loop; receipt binds inputs, exact cases and report bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['skills', 'plan', 'verify', 'run'])
    args = parser.parse_args()
    try: {'skills': check_skill_installation, 'plan': plan, 'verify': verify, 'run': run}[args.action]()
    except (ValueError, OSError, ET.ParseError, subprocess.CalledProcessError) as error:
        print(f'FAIL quality gate: {error}', file=sys.stderr)
        sys.exit(1)
