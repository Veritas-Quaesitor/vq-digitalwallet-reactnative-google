import { SDK_VERSION } from '../../src/version';

describe('SDK_VERSION', () => {
  it('matches the initial package version', () => {
    expect(SDK_VERSION).toBe('0.1.0');
  });
});
