"""Install Google's self-contained tools with verified archives and bounded retries."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import zipfile

from build_support import sanitize_build_line

TOOLS_URL = 'https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip'
TOOLS_SHA1 = '48833c34b761c10cb20bcd16582129395d121b27'

def transient_download_error(output):
    text = output.lower()
    if any(x in text for x in ['403', '401', 'pkix', 'certificate_unknown', 'checksum mismatch', 'failed to find package']):
        return False
    return any(x in text for x in ['peer disconnected', 'connection reset', 'timed out', 'timeout', 'failed to download', 'could not resolve host'])

def run_sdk(command, env, attempts=3, timeout=600):
    for attempt in range(attempts):
        try:
            result = subprocess.run(command, input='y\n' * 200, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT, env=env, timeout=timeout)
            output = result.stdout
        except subprocess.TimeoutExpired:
            output = 'SDK network operation timed out'; result = None
        safe = '\n'.join(sanitize_build_line(line) for line in output.splitlines())
        print(safe, flush=True)
        if result is not None and result.returncode == 0:
            return safe
        if attempt + 1 == attempts or not transient_download_error(output):
            raise RuntimeError(safe[-20000:])
        print(f'Retrying interrupted SDK transfer ({attempt + 2}/{attempts}).', flush=True)
        time.sleep(2 ** (attempt + 1))

def verified_extract(archive, destination, expected):
    with Path(archive).open('rb') as source:
        actual = hashlib.file_digest(source, 'sha1').hexdigest()
    if actual != expected:
        raise RuntimeError('SDK archive checksum mismatch')
    destination = Path(destination)
    with zipfile.ZipFile(archive) as package:
        for item in package.infolist():
            path = Path(item.filename)
            if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'cmdline-tools':
                raise RuntimeError('Unsafe SDK archive path')
            target = destination / path
            if item.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(package.read(item))
                if item.external_attr >> 16:
                    target.chmod(item.external_attr >> 16)

def main():
    root = Path(__file__).resolve().parent.parent
    sdk = Path(os.environ['ANDROID_HOME'])
    env = {**os.environ, 'ANDROID_SDK_ROOT': str(sdk)}
    artifacts = root / 'artifacts'; artifacts.mkdir(exist_ok=True)
    try:
        tools = sdk / 'cmdline-tools/latest'
        properties = tools / 'source.properties'
        if not properties.exists() or 'Pkg.Revision=20.0' not in properties.read_text().replace(' ', ''):
            with tempfile.TemporaryDirectory(prefix='parentplus-sdk-') as temp:
                archive = Path(temp) / 'tools.zip'
                subprocess.run(['curl', '--fail', '--location', '--retry', '3', '--retry-all-errors',
                                '--connect-timeout', '20', '--max-time', '180', TOOLS_URL, '-o', str(archive)], check=True)
                verified_extract(archive, Path(temp) / 'verified', TOOLS_SHA1)
                if tools.exists(): shutil.rmtree(tools)
                tools.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(Path(temp) / 'verified/cmdline-tools'), tools)
        manager = str(tools / 'bin/sdkmanager')
        run_sdk([manager, f'--sdk_root={sdk}', '--licenses'], env, timeout=180)
        run_sdk([manager, f'--sdk_root={sdk}', 'platform-tools', 'platforms;android-37.0',
                 'build-tools;37.0.0', 'ndk;27.1.12297006', 'cmake;3.22.1'], env)
        required = ['platforms/android-37.0/android.jar', 'build-tools/37.0.0/apksigner',
                    'ndk/27.1.12297006/source.properties', 'cmake/3.22.1/bin/cmake']
        missing = [path for path in required if not (sdk / path).is_file()]
        if missing: raise RuntimeError('SDK installation incomplete: ' + ', '.join(missing))
        print('Verified SDK tools 20.0 and all required Android packages are ready.', flush=True)
    except Exception as error:
        tail = [sanitize_build_line(line) for line in str(error).splitlines()][-120:]
        (artifacts / 'build-failure.json').write_text(json.dumps({'stage': 'sdk-install', 'tail': tail}, indent=2))
        raise

if __name__ == '__main__': main()
