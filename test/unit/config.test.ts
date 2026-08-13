import { resolveConfig } from '../../src/core/config';

const validConfig = {
  merchant: {
    identifier: '12345678901234567890',
    displayName: 'Example Merchant',
  },
  gateway: { name: 'example', merchantId: 'exampleGatewayMerchantId' },
};

describe('resolveConfig', () => {
  it('applies and freezes the approved South African defaults', () => {
    const resolved = resolveConfig(validConfig);

    expect(resolved.defaults).toEqual({ countryCode: 'ZA', currency: 'ZAR' });
    expect(resolved.paymentMethod).toEqual({
      allowedCardNetworks: ['MASTERCARD', 'VISA'],
      allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    });
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.paymentMethod.allowedCardNetworks)).toBe(
      true,
    );
    expect(Object.isFrozen(resolved.merchant)).toBe(true);
    expect(Object.isFrozen(resolved.gateway)).toBe(true);
  });

  it('copies and freezes explicit merchant policy without mutating its input', () => {
    const networks = ['AMEX', 'VISA'] as const;
    const config = {
      ...validConfig,
      paymentMethod: {
        allowedCardNetworks: networks,
        allowedAuthMethods: ['CRYPTOGRAM_3DS'] as const,
      },
      defaults: { countryCode: 'US', currency: 'USD' },
    };

    const resolved = resolveConfig(config);

    expect(resolved.paymentMethod.allowedCardNetworks).toEqual(networks);
    expect(resolved.paymentMethod.allowedCardNetworks).not.toBe(networks);
    expect(resolved.paymentMethod.allowedAuthMethods).toEqual([
      'CRYPTOGRAM_3DS',
    ]);
    expect(resolved.defaults).toEqual({ countryCode: 'US', currency: 'USD' });
  });

  it('retains reviewed observability adapters in a frozen container', () => {
    const logger = { log: jest.fn() };
    const eventSink = { emit: jest.fn() };

    const resolved = resolveConfig({
      ...validConfig,
      observability: { logger, eventSink },
    });

    expect(resolved.observability).toEqual({ logger, eventSink });
    expect(Object.isFrozen(resolved.observability)).toBe(true);
  });

  it.each([
    { ...validConfig, unexpected: true },
    { ...validConfig, merchant: { ...validConfig.merchant, unexpected: true } },
    {
      ...validConfig,
      merchant: { ...validConfig.merchant, identifier: 'invalid id' },
    },
    { ...validConfig, gateway: { ...validConfig.gateway, name: 'bad\nname' } },
    { ...validConfig, defaults: { currency: 'zar' } },
    { ...validConfig, defaults: { countryCode: 'ZAF' } },
    { ...validConfig, defaults: { unexpected: true } },
    { ...validConfig, paymentMethod: { allowedCardNetworks: [] } },
    {
      ...validConfig,
      paymentMethod: { allowedCardNetworks: ['VISA', 'VISA'] },
    },
    {
      ...validConfig,
      paymentMethod: { allowedAuthMethods: ['UNSUPPORTED'] },
    },
    { ...validConfig, paymentMethod: { unexpected: true } },
    { ...validConfig, observability: { unexpected: true } },
    { ...validConfig, observability: { logger: {} } },
    { ...validConfig, observability: { eventSink: { emit: 'not-a-method' } } },
  ])('rejects invalid or unknown configuration %#', (config) => {
    expect(() => resolveConfig(config as never)).toThrow(
      expect.objectContaining({ code: 'INVALID_CONFIGURATION' }),
    );
  });
});
