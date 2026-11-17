"""Verify the compatibility contract for the APK handed to the owner."""
from pathlib import Path
import tempfile
import unittest
import zipfile
from build_support import verify_apk_architectures

class ApkArchitecturesTests(unittest.TestCase):
    def archive(self, libraries):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        path = Path(temp.name) / 'preview.apk'
        with zipfile.ZipFile(path, 'w') as package:
            for abi, machine in libraries.items():
                header = bytearray(20)
                header[:6] = b'\x7fELF\x02\x01'
                header[18:20] = machine.to_bytes(2, 'little')
                package.writestr(f'lib/{abi}/libfixture.so', header)
        return path

    def test_accepts_both_real_native_machine_types(self):
        path = self.archive({'arm64-v8a': 183, 'x86_64': 62})
        self.assertEqual(verify_apk_architectures(path), {'arm64-v8a': 1, 'x86_64': 1})

    def test_rejects_phone_only_apk_for_emulator_delivery(self):
        with self.assertRaisesRegex(RuntimeError, 'architectures do not match'):
            verify_apk_architectures(self.archive({'arm64-v8a': 183}))

    def test_rejects_a_library_mislabeled_as_another_architecture(self):
        with self.assertRaisesRegex(RuntimeError, 'invalid x86_64 ELF'):
            verify_apk_architectures(self.archive({'arm64-v8a': 183, 'x86_64': 183}))

    def test_rejects_unexpected_native_architectures(self):
        with self.assertRaisesRegex(RuntimeError, 'architectures do not match'):
            verify_apk_architectures(self.archive({'arm64-v8a': 183, 'x86_64': 62, 'armeabi-v7a': 40}))

if __name__ == '__main__': unittest.main()
