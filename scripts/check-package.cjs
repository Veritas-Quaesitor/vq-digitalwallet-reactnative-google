'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'npm_execpath is required; run this check through npm');
const runNpm = (args, options) =>
  execFileSync(node, [npmCli, ...args], options);
const output = runNpm(['pack', '--json', '--ignore-scripts'], {
  cwd: root,
  encoding: 'utf8',
});
const [packed] = JSON.parse(output);
assert.ok(packed, 'npm pack produced no artifact metadata');
assert.ok(
  packed.size <= 100 * 1024,
  `package exceeds 100 KiB budget: ${packed.size}`,
);
assert.ok(
  packed.unpackedSize <= 250 * 1024,
  `unpacked package exceeds 250 KiB budget: ${packed.unpackedSize}`,
);

const allowedRoots = new Set([
  'android',
  'lib',
  'LICENSE',
  'package.json',
  'README.md',
  'src',
]);
for (const entry of packed.files) {
  const rootName = entry.path.split('/')[0];
  assert.ok(
    allowedRoots.has(rootName),
    `unexpected packaged path: ${entry.path}`,
  );
}
for (const required of [
  'package.json',
  'lib/module/index.js',
  'lib/typescript/src/index.d.ts',
  'android/build.gradle',
  'android/src/main/AndroidManifest.xml',
  'src/NativeVqGooglePay.ts',
  'src/VqGooglePayButtonNativeComponent.ts',
]) {
  assert.ok(
    packed.files.some(({ path: file }) => file === required),
    `missing packaged path: ${required}`,
  );
}

const tarball = path.join(root, packed.filename);
const consumer = fs.mkdtempSync(
  path.join(os.tmpdir(), 'vq-google-pay-consumer-'),
);
try {
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  const installedPackage = path.join(
    consumer,
    'node_modules',
    'vq-digitalwallet-reactnative-google',
  );
  fs.mkdirSync(installedPackage, { recursive: true });
  execFileSync(
    'tar',
    ['-xzf', tarball, '-C', installedPackage, '--strip-components=1'],
    { stdio: 'pipe' },
  );
  const installedManifest = JSON.parse(
    fs.readFileSync(path.join(installedPackage, 'package.json'), 'utf8'),
  );
  for (const entry of [
    installedManifest.exports['.'].default,
    installedManifest.exports['.'].types,
  ]) {
    assert.ok(
      fs.existsSync(path.resolve(installedPackage, entry)),
      `installed manifest points to missing entry: ${entry}`,
    );
  }
  const moduleRoot = path.join(installedPackage, 'lib', 'module');
  const moduleFiles = fs
    .readdirSync(moduleRoot)
    .filter((file) => file.endsWith('.js'));
  for (const file of moduleFiles) {
    execFileSync(node, ['--check', path.join(moduleRoot, file)], {
      stdio: 'pipe',
    });
  }
  const publicEntry = fs.readFileSync(
    path.join(moduleRoot, 'index.js'),
    'utf8',
  );
  assert.match(publicEntry, /SDK_VERSION/);
  assert.match(publicEntry, /VqGooglePayButton/);
  assert.match(publicEntry, /createVqGooglePay/);
  assert.match(publicEntry, /VqWalletError/);
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
  fs.rmSync(tarball, { force: true });
}

process.stdout.write(
  `Verified ${packed.filename} (${packed.size} bytes) in an isolated consumer.\n`,
);
