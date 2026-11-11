"""Regression checks for the SDK bootstrap failure and safe diagnostics."""
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('installer', Path(__file__).with_name('install-android-sdk.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

class InstallerTests(unittest.TestCase):
    def test_only_transient_downloads_retry(self):
        self.assertTrue(installer.transient_download_error('gzip decompression failed: Peer disconnected'))
        for error in ['HTTP 403 failed to download', 'PKIX failed to download', 'checksum mismatch', 'Failed to find package']:
            self.assertFalse(installer.transient_download_error(error))

    @patch.object(installer.time, 'sleep')
    @patch.object(installer.subprocess, 'run')
    def test_interrupted_transfer_retries_then_succeeds(self, run, sleep):
        run.side_effect = [subprocess.CompletedProcess([], 1, 'Peer disconnected'), subprocess.CompletedProcess([], 0, 'Ready')]
        self.assertEqual(installer.run_sdk(['sdkmanager'], {}), 'Ready')
        self.assertEqual(run.call_count, 2)
        sleep.assert_called_once_with(2)

    @patch.object(installer.subprocess, 'run')
    def test_denial_stops_without_retry(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, 'HTTP 403 failed to download')
        with self.assertRaises(RuntimeError): installer.run_sdk(['sdkmanager'], {})
        self.assertEqual(run.call_count, 1)

    @patch.object(installer.time, 'sleep')
    @patch.object(installer.subprocess, 'run')
    def test_timeout_retries_are_bounded(self, run, sleep):
        run.side_effect = subprocess.TimeoutExpired([], 1)
        with self.assertRaises(RuntimeError): installer.run_sdk(['sdkmanager'], {})
        self.assertEqual(run.call_count, 3)

    def test_checksum_and_path_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'tools.zip'
            with zipfile.ZipFile(archive, 'w') as package: package.writestr('cmdline-tools/../escape', 'invalid')
            digest = hashlib.sha1(archive.read_bytes()).hexdigest()
            with self.assertRaisesRegex(RuntimeError, 'checksum'): installer.verified_extract(archive, Path(folder) / 'out', 'wrong')
            with self.assertRaisesRegex(RuntimeError, 'Unsafe'): installer.verified_extract(archive, Path(folder) / 'out', digest)
            self.assertFalse((Path(folder) / 'escape').exists())

    def test_signed_urls_and_tokens_are_redacted(self):
        output = installer.sanitize_build_line('https://user:pass@example.com/sdk?token=private ghp_exampletoken sb_secret_example')
        self.assertNotIn('private', output)
        self.assertNotIn('user:pass', output)
        self.assertNotIn('ghp_exampletoken', output)
        self.assertNotIn('sb_secret_example', output)

if __name__ == '__main__': unittest.main()
