'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const lib = path.join(root, 'lib');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'npm_execpath is required; run this check through npm');
const snapshot = () => {
  const hashes = new Map();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else
        hashes.set(
          path.relative(lib, file).replaceAll('\\', '/'),
          crypto
            .createHash('sha256')
            .update(fs.readFileSync(file))
            .digest('hex'),
        );
    }
  };
  visit(lib);
  return [...hashes.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
};

assert.ok(fs.existsSync(lib), 'build output is missing');
const first = snapshot();
execFileSync(process.execPath, [npmCli, 'run', 'build'], {
  cwd: root,
  stdio: 'inherit',
});
assert.deepEqual(
  snapshot(),
  first,
  'the built JavaScript/declaration artifact is nondeterministic',
);
process.stdout.write(
  `Build output is deterministic across ${first.length} files.\n`,
);
