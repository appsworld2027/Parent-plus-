"""Build an installable internal Android preview without Expo account credentials.

Uses an installed Android SDK with API 37.0, build tools 37.0.0, and NDK 27b.
The generated preview uses the standard development signing configuration;
production/store signing remains a separate release requirement.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

from build_support import sanitize_build_line, verify_apk_architectures

# One APK contains phone and Intel/AMD emulator native libraries.
architectures = ('arm64-v8a', 'x86_64')
root = Path(__file__).resolve().parent.parent
revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
env = {**os.environ, 'PARENTPLUS_BUILD_VARIANT': 'preview', 'EXPO_PUBLIC_APP_ENV': 'test',
       'EXPO_NO_TELEMETRY': '1', 'EXPO_OFFLINE': '1', 'EXPO_NO_DOTENV': '1', 'CMAKE_BUILD_PARALLEL_LEVEL': '2',
       'EXPO_PUBLIC_BUILD_SHA': revision}
sdk = Path(env.get('ANDROID_HOME', '/workspace/.parentplus/android-sdk'))
if not (sdk / 'platforms/android-37.0/android.jar').is_file():
    raise SystemExit('Install the official Android SDK Platform 37.0 before building.')
subprocess.run(['npx', '--no-install', 'expo', 'prebuild', '--platform', 'android', '--no-install', '--clean'], cwd=root, env=env, check=True)
wrapper = root / 'android/gradle/wrapper/gradle-wrapper.properties'
text = wrapper.read_text()
if 'gradle-9.4.1-bin.zip' not in text:
    raise SystemExit('Unexpected Gradle distribution; verify the official checksum before updating this build script.')
text = re.sub(r'^distributionSha256Sum=.*\n?', '', text, flags=re.MULTILINE)
wrapper.write_text(text.replace('networkTimeout=10000', 'networkTimeout=60000') + '\ndistributionSha256Sum=2ab2958f2a1e51120c326cad6f385153bb11ee93b3c216c5fccebfdfbb7ec6cb\n')
(root / 'android/local.properties').write_text(f'sdk.dir={sdk}\n')
java17 = env.get('PARENTPLUS_JAVA17', env.get('JAVA_HOME_17_X64'))
if java17:
    gradle_props = root / 'android/gradle.properties'
    with gradle_props.open('a') as output:
        output.write(f'\norg.gradle.java.installations.paths={java17}\nkotlin.compiler.execution.strategy=in-process\n')
command = ['./gradlew', ':app:assembleRelease', '--no-daemon', '--max-workers=2',
                f'-PreactNativeArchitectures={",".join(architectures)}', '-Pandroid.enableMinifyInReleaseBuilds=false',
                '-Pandroid.enableShrinkResourcesInReleaseBuilds=false', '-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g']
process = subprocess.Popen(command, cwd=root / 'android', env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
tail = []
for line in process.stdout:
    print(line, end='', flush=True)
    tail = (tail + [sanitize_build_line(line)])[-120:]
if process.wait() != 0:
    output = root / 'artifacts'; output.mkdir(exist_ok=True)
    (output / 'build-failure.json').write_text(json.dumps({'sourceSha': revision, 'exitCode': process.returncode, 'tail': tail}, indent=2))
    raise SystemExit(process.returncode)
apk = root / 'android/app/build/outputs/apk/release/app-release.apk'
subprocess.run([str(sdk / 'build-tools/37.0.0/apksigner'), 'verify', '--verbose', str(apk)], check=True)
# Register capture requires camera; microphone access remains forbidden. Inspect the
# built manifest, including permissions merged from dependency manifests.
permissions_dump = subprocess.check_output([str(sdk / 'build-tools/37.0.0/aapt2'), 'dump', 'permissions', str(apk)], text=True)
if 'android.permission.INTERNET' not in permissions_dump:
    raise RuntimeError('APK permissions could not be verified')
if 'android.permission.CAMERA' not in permissions_dump or 'android.permission.RECORD_AUDIO' in permissions_dump:
    raise RuntimeError('APK must support register camera capture without microphone access')
try:
    native_libraries = verify_apk_architectures(apk, architectures)
except Exception as error:
    output = root / 'artifacts'; output.mkdir(exist_ok=True)
    (output / 'build-failure.json').write_text(json.dumps({'sourceSha': revision, 'stage': 'apk-architecture-check', 'tail': [sanitize_build_line(str(error))]}, indent=2))
    raise
output = root / 'artifacts'; output.mkdir(exist_ok=True)
target = output / 'ParentPlus-Coach-Preview.apk'; shutil.copy2(apk, target)
report = {'sourceSha': revision, 'package': 'com.parentplus.coach.preview', 'architecture': ','.join(architectures), 'architectures': list(architectures), 'nativeLibraries': native_libraries,
          'signing': 'development', 'cameraPresentMicrophoneAbsent': True, 'bytes': target.stat().st_size, 'sha256': hashlib.file_digest(target.open('rb'), 'sha256').hexdigest()}
(output / 'android-build.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
