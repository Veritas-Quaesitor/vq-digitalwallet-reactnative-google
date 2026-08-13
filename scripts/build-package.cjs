'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const run = (program, args) => {
  execFileSync(program, args, { cwd: root, stdio: 'inherit' });
};

// Builder Bob's declaration target uses piped child-process handles. Node 24 on
// Windows can reject that spawn with EPERM; inherited handles are unaffected.
// Keep Bob for the JavaScript module output and invoke the same workspace
// TypeScript compiler directly for the declaration output.
run(process.execPath, [
  path.join(root, 'node_modules', 'react-native-builder-bob', 'bin', 'bob'),
  'build',
  '--target',
  'module',
]);
run(process.execPath, [
  path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
  '--pretty',
  '--declaration',
  '--declarationMap',
  '--noEmit',
  'false',
  '--emitDeclarationOnly',
  '--project',
  'tsconfig.build.json',
  '--outDir',
  'lib/typescript',
]);
