#!/usr/bin/env node
/**
 * Builds a signed Android APK from the web bundle.
 *
 *   npm run apk                 # release build (needs a keystore) or debug fallback
 *   npm run apk -- --debug      # force a debug build
 *
 * Requirements:
 *   - JAVA_HOME pointing at a JDK 17+
 *   - ANDROID_HOME / ANDROID_SDK_ROOT with platform 35 + build-tools 35
 *
 * The web bundle is compiled with a relative base so it can be loaded from
 * file:///android_asset/www/index.html inside the WebView.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const androidDir = join(root, 'android');
const isWindows = process.platform === 'win32';
const forceDebug = process.argv.includes('--debug');

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(' ')}  (${cwd})`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n[apk] command failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function findGradle() {
  const wrapper = join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew');
  if (existsSync(wrapper)) return { command: wrapper, cwd: androidDir };
  return { command: isWindows ? 'gradle.bat' : 'gradle', cwd: androidDir };
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// 1. Web bundle with relative asset paths (required for file:// loading).
run(isWindows ? 'npm.cmd' : 'npm', ['run', 'build:android'], root);

// 2. Gradle build.
const gradle = findGradle();
const task = forceDebug ? 'assembleDebug' : 'assembleRelease';
run(gradle.command, [task, '--no-daemon'], gradle.cwd);

// 3. Collect artifacts.
const apkRoot = join(androidDir, 'app', 'build', 'outputs', 'apk');
if (!existsSync(apkRoot)) {
  console.error('[apk] no APK output directory — did the Gradle build fail?');
  process.exit(1);
}

const releaseDir = join(root, 'release');
mkdirSync(releaseDir, { recursive: true });

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const variants = readdirSync(apkRoot, { withFileTypes: true }).filter(entry => entry.isDirectory());
const collected = [];

for (const variant of variants) {
  const dir = join(apkRoot, variant.name);
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.apk')) continue;
    const source = join(dir, file);
    const signed = !file.includes('unsigned');
    const suffix = signed ? 'signed' : 'unsigned';
    const target = join(releaseDir, `LiquidObsidian-${version}-${variant.name}-${suffix}.apk`);
    copyFileSync(source, target);
    collected.push(target);
    console.log(`[apk] ${target}  (${(statSync(target).size / (1024 * 1024)).toFixed(2)} MB)`);
  }
}

if (collected.length === 0) {
  console.error('[apk] build produced no .apk files');
  process.exit(1);
}

const sums = collected.map(file => `${sha256(file)}  ${file.split(/[\\/]/).pop()}`).join('\n');
writeFileSync(join(releaseDir, 'SHA256SUMS.txt'), `${sums}\n`, 'utf8');
console.log(`\n[apk] wrote release/SHA256SUMS.txt`);
console.log('[apk] one universal APK covers arm64-v8a, armeabi-v7a, x86 and x86_64.');
