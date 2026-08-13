'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const lock = require(path.join(root, 'package-lock.json'));

assert.match(pkg.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
assert.equal(
  pkg.private,
  true,
  'the private delivery package must not be publishable',
);
assert.equal(
  pkg.publishConfig,
  undefined,
  'public npm publication is not approved',
);
assert.equal(lock.version, pkg.version, 'lockfile version drifted');
assert.equal(
  lock.packages[''].version,
  pkg.version,
  'lockfile root version drifted',
);
assert.match(
  read('src/version.ts'),
  new RegExp(`SDK_VERSION = '${pkg.version}'`),
);
assert.equal(pkg.codegenConfig.type, 'all');
assert.equal(
  pkg.codegenConfig.android.javaPackageName,
  'com.veritasquaesitor.vqgooglepay',
);
assert.equal(pkg.peerDependencies.reactNative, undefined);
assert.equal(pkg.peerDependencies['react-native'], '^0.85.0 || ^0.86.0');
assert.equal(
  pkg.dependencies,
  undefined,
  'runtime npm dependencies require an explicit decision',
);

const directAndroidDependencies = read('android/build.gradle');
assert.match(directAndroidDependencies, /play-services-wallet:20\.0\.0/);
assert.match(directAndroidDependencies, /activity-ktx:1\.13\.0/);
assert.doesNotMatch(
  directAndroidDependencies,
  /(?:^|:)\+['"]?/m,
  'dynamic Gradle versions are forbidden',
);
assert.match(
  read('android/src/main/AndroidManifest.xml'),
  /com\.google\.android\.gms\.wallet\.api\.enabled/,
);
assert.match(read('.nvmrc').trim(), /^24\.11\.1$/);

for (const dependencyName of Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
  ...pkg.devDependencies,
})) {
  assert.notEqual(dependencyName, '@google/react-native-make-payment');
}

process.stdout.write(
  `Source, metadata, and direct dependencies are coherent for ${pkg.version}.\n`,
);
