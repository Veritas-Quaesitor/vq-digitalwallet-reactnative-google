'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const example = path.join(root, 'example');
const packageName = 'vq-digitalwallet-reactnative-google';
const installedPackage = path.join(example, 'node_modules', packageName);
const autolinkingFile = path.join(
  example,
  'android',
  'build',
  'generated',
  'autolinking',
  'autolinking.json',
);
const node = process.execPath;
const npmCli = process.env.npm_execpath;

assert.ok(npmCli, 'npm_execpath is required; run this check through npm');
assert.ok(
  !fs.existsSync(installedPackage),
  `refusing to replace existing local package: ${installedPackage}`,
);

let tarball;
try {
  const output = execFileSync(
    node,
    [npmCli, 'pack', '--json', '--ignore-scripts'],
    { cwd: root, encoding: 'utf8' },
  );
  const [packed] = JSON.parse(output);
  assert.ok(packed, 'npm pack produced no artifact metadata');
  tarball = path.join(root, packed.filename);

  fs.mkdirSync(installedPackage, { recursive: true });
  execFileSync(
    'tar',
    ['-xzf', tarball, '-C', installedPackage, '--strip-components=1'],
    { stdio: 'pipe' },
  );

  // Gradle clean does not own this settings-plugin output. Removing only the
  // generated manifest forces autolinking to resolve the packed local package.
  fs.rmSync(autolinkingFile, { force: true });

  const gradle = path.join(
    example,
    'android',
    process.platform === 'win32' ? 'gradlew.bat' : 'gradlew',
  );
  if (process.platform !== 'win32') {
    fs.chmodSync(gradle, 0o755);
  }
  const gradleArgs = [
    ':app:assembleDebug',
    '--no-daemon',
    '--console=plain',
    '-PreactNativeArchitectures=x86_64',
  ];
  if (process.platform === 'win32') {
    execFileSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', ['.\\gradlew.bat', ...gradleArgs].join(' ')],
      { cwd: path.join(example, 'android'), stdio: 'inherit' },
    );
  } else {
    execFileSync(gradle, gradleArgs, {
      cwd: path.join(example, 'android'),
      stdio: 'inherit',
    });
  }

  const autolinking = JSON.parse(fs.readFileSync(autolinkingFile, 'utf8'));
  const sourceDir =
    autolinking.dependencies[packageName].platforms.android.sourceDir;
  assert.equal(
    path.resolve(sourceDir),
    path.join(installedPackage, 'android'),
    'Android consumer did not compile against the packed artifact',
  );

  process.stdout.write(
    `Compiled Android consumer against exact artifact ${packed.filename}.\n`,
  );
} finally {
  fs.rmSync(installedPackage, { recursive: true, force: true });
  fs.rmSync(autolinkingFile, { force: true });
  if (tarball) {
    fs.rmSync(tarball, { force: true });
  }
}
