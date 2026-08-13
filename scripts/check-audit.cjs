'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'npm_execpath is required; run this check through npm');
const exception = require(path.join(root, 'security', 'audit-exceptions.json'));

let output;
try {
  output = execFileSync(process.execPath, [npmCli, 'audit', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  assert.equal(
    error.status,
    1,
    'npm audit failed for a reason other than advisories',
  );
  output = error.stdout;
}

const audit = JSON.parse(output);
const today = new Date().toISOString().slice(0, 10);
assert.ok(
  today <= exception.expiresOn,
  `audit exception expired on ${exception.expiresOn}`,
);
assert.equal(
  audit.metadata.vulnerabilities.critical,
  0,
  'critical vulnerabilities are never excepted',
);

const actualNames = Object.keys(audit.vulnerabilities).sort();
const allowedNames = [...exception.allowedVulnerabilityNames].sort();
assert.deepEqual(
  actualNames,
  allowedNames,
  'the advisory set differs from the approved exception',
);

const actualSources = new Set();
for (const [name, vulnerability] of Object.entries(audit.vulnerabilities)) {
  assert.equal(vulnerability.severity, 'high', `${name} changed severity`);
  for (const cause of vulnerability.via) {
    if (typeof cause === 'string') {
      assert.ok(
        allowedNames.includes(cause),
        `${name} has an unapproved dependency cause: ${cause}`,
      );
    } else {
      actualSources.add(cause.source);
    }
  }
}

assert.deepEqual(
  [...actualSources].sort((left, right) => left - right),
  [...exception.allowedAdvisorySources].sort((left, right) => left - right),
  'the advisory sources differ from the approved exception',
);
assert.equal(audit.vulnerabilities['image-size'].isDirect, false);

process.stdout.write(
  `Audit contains only the approved image-size advisory chain; exception expires ${exception.expiresOn}.\n`,
);
