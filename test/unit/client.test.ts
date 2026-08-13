jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('../../src/NativeVqGooglePay', () => ({
  __esModule: true,
  default: {
    checkAvailability: jest.fn<Promise<boolean>, [string]>(),
    encodePaymentToken: jest.fn<string, [string]>(),
    getFoundationStatus: jest.fn<string, []>(),
    getGooglePayEnvironment: jest.fn<string, []>(),
    requestPayment: jest.fn<Promise<string>, [string]>(),
  },
}));

import { Platform } from 'react-native';
import NativeVqGooglePay from '../../src/NativeVqGooglePay';
import {
  createVqGooglePay,
  getButtonAllowedPaymentMethods,
  getGooglePayEnvironment,
} from '../../src/google-pay/client';

const mockNativeModule = jest.mocked(NativeVqGooglePay)!;

const config = {
  merchant: {
    identifier: '12345678901234567890',
    displayName: 'Example Merchant',
  },
  gateway: { name: 'example', merchantId: 'exampleGatewayMerchantId' },
};

describe('VqGooglePayClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as { OS: string }).OS = 'android';
    mockNativeModule.encodePaymentToken.mockImplementation(
      (jsonString) => `encoded:${jsonString}`,
    );
    mockNativeModule.getGooglePayEnvironment.mockReturnValue('TEST');
  });

  it('returns readiness from the protected native request', async () => {
    mockNativeModule.checkAvailability.mockResolvedValue(true);

    await expect(
      createVqGooglePay(config).checkAvailability(),
    ).resolves.toEqual({
      status: 'available',
    });
    expect(
      JSON.parse(mockNativeModule.checkAvailability.mock.calls[0]![0]),
    ).not.toHaveProperty('transactionInfo');
  });

  it('reports only a validated immutable Google Pay build environment', () => {
    mockNativeModule.getGooglePayEnvironment.mockReturnValue('PRODUCTION');
    expect(getGooglePayEnvironment()).toBe('PRODUCTION');

    mockNativeModule.getGooglePayEnvironment.mockReturnValue('INVALID');
    expect(() => getGooglePayEnvironment()).toThrow(
      'The Google Pay build environment is invalid.',
    );

    (Platform as { OS: string }).OS = 'ios';
    expect(() => getGooglePayEnvironment()).toThrow(
      'Google Pay requires Android.',
    );
  });

  it('binds the managed button to the client card policy', () => {
    const client = createVqGooglePay({
      ...config,
      paymentMethod: {
        allowedCardNetworks: ['AMEX'],
        allowedAuthMethods: ['CRYPTOGRAM_3DS'],
      },
    });

    expect(JSON.parse(getButtonAllowedPaymentMethods(client)!)).toEqual([
      {
        type: 'CARD',
        parameters: {
          allowedCardNetworks: ['AMEX'],
          allowedAuthMethods: ['CRYPTOGRAM_3DS'],
        },
      },
    ]);
  });

  it('reports Android and native readiness limitations without throwing', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await expect(
      createVqGooglePay(config).checkAvailability(),
    ).resolves.toEqual({ status: 'unsupported', reason: 'android-required' });

    (Platform as { OS: string }).OS = 'android';
    mockNativeModule.checkAvailability.mockResolvedValueOnce(false);
    await expect(
      createVqGooglePay(config).checkAvailability(),
    ).resolves.toEqual({ status: 'unavailable', reason: 'not-ready' });

    mockNativeModule.checkAvailability.mockRejectedValueOnce({
      code: 'GOOGLE_PLAY_SERVICES_UNAVAILABLE',
    });
    await expect(
      createVqGooglePay(config).checkAvailability(),
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'google-play-services-unavailable',
    });

    mockNativeModule.checkAvailability.mockRejectedValueOnce({
      code: 'NATIVE_MODULE_UNAVAILABLE',
    });
    await expect(
      createVqGooglePay(config).checkAvailability(),
    ).resolves.toEqual({
      status: 'unsupported',
      reason: 'native-module-unavailable',
    });
  });

  it('preserves unexpected readiness failures as stable SDK errors', async () => {
    mockNativeModule.checkAvailability.mockRejectedValue({
      code: 'DEVELOPER_ERROR',
      message: 'unsafe native detail',
    });

    await expect(createVqGooglePay(config).checkAvailability()).rejects.toEqual(
      expect.objectContaining({
        code: 'DEVELOPER_ERROR',
        message: 'The Google Pay request configuration was rejected.',
      }),
    );
  });

  it('passes the opaque token through JSON.stringify then native Base64 exactly once', async () => {
    const rawToken =
      '{"signature":"synthetic\\u003d","signedMessage":"{\\"encryptedMessage\\":\\"abc==\\"}"}';
    mockNativeModule.requestPayment.mockResolvedValue(rawToken);

    const result = await createVqGooglePay(config).pay({
      orderNumber: 'ORDER-12345',
      amount: { value: '1.59' },
    });

    const stringifiedToken = JSON.stringify(rawToken);
    expect(mockNativeModule.encodePaymentToken).toHaveBeenCalledTimes(1);
    expect(mockNativeModule.encodePaymentToken).toHaveBeenCalledWith(
      stringifiedToken,
    );
    expect(result.paymentToken).toBe(`encoded:${stringifiedToken}`);
    expect(result.orderNumber).toBe('ORDER-12345');
    expect(result.sdkRequestId).toMatch(/^vq-/);
    expect(result.googlePayEnvironment).toBe('TEST');
    const googleRequest = JSON.parse(
      mockNativeModule.requestPayment.mock.calls[0]?.[0] ?? '{}',
    );
    expect(googleRequest.transactionInfo).not.toHaveProperty('transactionId');
  });

  it('maps native cancellation without exposing its message', async () => {
    mockNativeModule.requestPayment.mockRejectedValue({
      code: 'USER_CANCELED',
      message: 'native detail must not escape',
    });

    await expect(
      createVqGooglePay(config).pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'USER_CANCELED',
        message: 'The user canceled Google Pay.',
        orderNumber: 'ORDER-12345',
      }),
    );
  });

  it('emits only redacted lifecycle events and ignores adapter failures', async () => {
    const events: unknown[] = [];
    const logs: unknown[] = [];
    const client = createVqGooglePay({
      ...config,
      observability: {
        eventSink: { emit: (event) => events.push(event) },
        logger: {
          log: (entry) => {
            logs.push(entry);
            throw new Error('merchant logger failure');
          },
        },
      },
    });
    mockNativeModule.checkAvailability.mockResolvedValue(true);
    mockNativeModule.requestPayment.mockResolvedValue('opaque-token');

    await client.checkAvailability();
    await client.pay({
      orderNumber: 'ORDER-OBSERVABILITY',
      amount: { value: '1.59' },
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: 'availability_checked',
        status: 'available',
      }),
      expect.objectContaining({
        type: 'payment_started',
        orderNumber: 'ORDER-OBSERVABILITY',
      }),
      expect.objectContaining({
        type: 'payment_completed',
        outcome: 'succeeded',
        orderNumber: 'ORDER-OBSERVABILITY',
      }),
    ]);
    expect(logs).toHaveLength(3);
    expect(JSON.stringify(events)).not.toContain('opaque-token');
    expect(JSON.stringify(events)).not.toContain('exampleGatewayMerchantId');
  });

  it('maps native encoding failures to the dedicated safe error', async () => {
    mockNativeModule.requestPayment.mockResolvedValue('opaque-token');
    mockNativeModule.encodePaymentToken.mockImplementation(() => {
      throw new Error('native encoding detail');
    });

    await expect(
      createVqGooglePay(config).pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'TOKEN_ENCODING_FAILED',
        category: 'token',
        message: 'The Google Pay token could not be encoded.',
      }),
    );
  });

  it('rejects an empty native token without encoding it', async () => {
    mockNativeModule.requestPayment.mockResolvedValue('');

    await expect(
      createVqGooglePay(config).pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'PLATFORM_ERROR' }));
    expect(mockNativeModule.encodePaymentToken).not.toHaveBeenCalled();
  });

  it('rejects payment on non-Android platforms before invoking native code', async () => {
    (Platform as { OS: string }).OS = 'ios';

    await expect(
      createVqGooglePay(config).pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_PLATFORM',
        orderNumber: 'ORDER-12345',
      }),
    );
    expect(mockNativeModule.requestPayment).not.toHaveBeenCalled();
  });

  it('preserves SDK validation errors instead of remapping them', async () => {
    await expect(
      createVqGooglePay(config).pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '0' },
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: 'INVALID_PAYMENT_REQUEST' }),
    );
    expect(mockNativeModule.requestPayment).not.toHaveBeenCalled();
  });

  it('handles an unlinked native module through the stable public contract', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('../../src/NativeVqGooglePay', () => ({
      __esModule: true,
      default: null,
    }));
    const {
      createVqGooglePay: createWithoutNative,
      getGooglePayEnvironment: getEnvironmentWithoutNative,
    } = await import('../../src/google-pay/client');
    const client = createWithoutNative(config);

    await expect(client.checkAvailability()).resolves.toEqual({
      status: 'unsupported',
      reason: 'native-module-unavailable',
    });
    await expect(
      client.pay({
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'NATIVE_MODULE_UNAVAILABLE',
        orderNumber: 'ORDER-12345',
      }),
    );
    expect(() => getEnvironmentWithoutNative()).toThrow(
      'The Google Pay native module is unavailable.',
    );
  });
});
