import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPECTED_ENCODED_PAYLOAD,
  RAW_GOOGLE_PAY_TOKEN,
} from '../fixtures/google-pay-token-contract.mjs';
import { encodeLegacyGooglePayToken } from '../reference/legacy-google-pay-token-encoding.mjs';

test('preserves the accepted Base64(JSON.stringify(raw token string)) wire contract', () => {
  assert.equal(
    encodeLegacyGooglePayToken(RAW_GOOGLE_PAY_TOKEN),
    EXPECTED_ENCODED_PAYLOAD,
  );
});

test('encodes a JSON string rather than the raw JSON object text', () => {
  const decoded = Buffer.from(EXPECTED_ENCODED_PAYLOAD, 'base64').toString('utf8');

  assert.equal(JSON.parse(decoded), RAW_GOOGLE_PAY_TOKEN);
  assert.notEqual(
    EXPECTED_ENCODED_PAYLOAD,
    Buffer.from(RAW_GOOGLE_PAY_TOKEN, 'utf8').toString('base64'),
  );
});

test('retains protocol-significant escape sequences without normalization', () => {
  const decoded = Buffer.from(EXPECTED_ENCODED_PAYLOAD, 'base64').toString('utf8');
  const recoveredRawToken = JSON.parse(decoded);

  assert.match(recoveredRawToken, /\\\\u003d/);
  assert.equal(JSON.parse(recoveredRawToken).protocolVersion, 'ECv2');
});

test('rejects missing token text instead of encoding an ambiguous value', () => {
  assert.throws(() => encodeLegacyGooglePayToken(''), {
    name: 'TypeError',
    message: 'rawGooglePayToken must be a non-empty string',
  });
  assert.throws(() => encodeLegacyGooglePayToken(null), TypeError);
});
