'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const androidRoot = path.resolve(__dirname, '..', 'example', 'android');
const args = [
  ':app:assembleDebug',
  '--no-daemon',
  '--console=plain',
  '-PreactNativeArchitectures=x86_64',
];

if (process.platform === 'win32') {
  const command = process.env.ComSpec;
  assert.ok(command, 'ComSpec is required to invoke gradlew.bat on Windows');
  execFileSync(command, ['/d', '/s', '/c', '.\\gradlew.bat', ...args], {
    cwd: androidRoot,
    stdio: 'inherit',
  });
} else {
  execFileSync('./gradlew', args, { cwd: androidRoot, stdio: 'inherit' });
}
