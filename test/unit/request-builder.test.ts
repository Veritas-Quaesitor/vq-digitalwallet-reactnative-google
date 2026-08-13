import { resolveConfig } from '../../src/core/config';
import {
  buildPaymentRequest,
  buildReadinessRequest,
} from '../../src/google-pay/request-builder';

const config = resolveConfig({
  merchant: {
    identifier: '12345678901234567890',
    displayName: 'Example Merchant',
  },
  gateway: { name: 'example', merchantId: 'exampleGatewayMerchantId' },
});

describe('Google Pay protected request builder', () => {
  it('builds readiness without tokenization or transaction data', () => {
    const request = JSON.parse(buildReadinessRequest(config));

    expect(request).toEqual({
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA'],
          },
        },
      ],
    });
  });

  it('builds the frozen PAYMENT_GATEWAY purchase request', () => {
    const request = JSON.parse(
      buildPaymentRequest(config, {
        orderNumber: 'ORDER-12345',
        amount: { value: '199.99' },
      }),
    );

    expect(request.allowedPaymentMethods[0].tokenizationSpecification).toEqual({
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'example',
        gatewayMerchantId: 'exampleGatewayMerchantId',
      },
    });
    expect(request.transactionInfo).toEqual({
      totalPriceStatus: 'FINAL',
      totalPrice: '199.99',
      totalPriceLabel: 'Total',
      currencyCode: 'ZAR',
      countryCode: 'ZA',
      checkoutOption: 'COMPLETE_IMMEDIATE_PURCHASE',
    });
  });

  it('uses only the approved per-payment overrides', () => {
    const request = JSON.parse(
      buildPaymentRequest(config, {
        orderNumber: 'ORDER-67890',
        amount: { value: '1', currency: 'USD' },
        countryCode: 'US',
        totalPriceLabel: 'Amount due',
      }),
    );

    expect(request.transactionInfo).toEqual(
      expect.objectContaining({
        totalPrice: '1',
        totalPriceLabel: 'Amount due',
        currencyCode: 'USD',
        countryCode: 'US',
      }),
    );
  });

  it.each(['0', '0.00', '1.999', '1000000.00', '01.00', 1.59])(
    'rejects unsafe amount %p',
    (value) => {
      expect(() =>
        buildPaymentRequest(config, {
          orderNumber: 'ORDER-12345',
          amount: { value: value as string },
        }),
      ).toThrow(expect.objectContaining({ code: 'INVALID_PAYMENT_REQUEST' }));
    },
  );

  it('rejects unknown payment request fields', () => {
    expect(() =>
      buildPaymentRequest(config, {
        orderNumber: 'ORDER-12345',
        amount: { value: '1.59' },
        rawGoogleRequest: {},
      } as never),
    ).toThrow(expect.objectContaining({ code: 'INVALID_PAYMENT_REQUEST' }));
  });

  it.each([
    {
      orderNumber: 'ORDER-12345',
      amount: { value: '1.59', currency: 'zar' },
    },
    {
      orderNumber: 'ORDER-12345',
      amount: { value: '1.59' },
      countryCode: 'ZAF',
    },
    {
      orderNumber: 'ORDER-12345',
      amount: { value: '1.59' },
      totalPriceLabel: 'bad\nlabel',
    },
    {
      orderNumber: '',
      amount: { value: '1.59' },
    },
    {
      orderNumber: 'ORDER-12345',
      amount: { value: '1.59', unsupported: true },
    },
  ])('rejects invalid protected payment fields %#', (request) => {
    expect(() => buildPaymentRequest(config, request as never)).toThrow(
      expect.objectContaining({ code: 'INVALID_PAYMENT_REQUEST' }),
    );
  });
});
