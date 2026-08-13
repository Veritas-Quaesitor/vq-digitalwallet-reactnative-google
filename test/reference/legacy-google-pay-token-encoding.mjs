/**
 * Reference-only implementation of the battle-tested web SDK wire contract.
 * This is an oracle for characterization tests, not the target mobile design.
 */
export function encodeLegacyGooglePayToken(rawGooglePayToken) {
  if (typeof rawGooglePayToken !== 'string' || rawGooglePayToken.length === 0) {
    throw new TypeError('rawGooglePayToken must be a non-empty string');
  }

  return Buffer.from(JSON.stringify(rawGooglePayToken), 'utf8').toString('base64');
}
