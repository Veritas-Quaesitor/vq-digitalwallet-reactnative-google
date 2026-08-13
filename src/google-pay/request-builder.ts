import type {
  GooglePayPaymentRequest,
  ResolvedVqGooglePayConfig,
} from '../core/contracts';
import { VqWalletError } from '../core/errors';

const API_VERSION = 2;
const API_VERSION_MINOR = 0;

export function buildReadinessRequest(
  config: ResolvedVqGooglePayConfig,
): string {
  return JSON.stringify({
    apiVersion: API_VERSION,
    apiVersionMinor: API_VERSION_MINOR,
    allowedPaymentMethods: buttonPaymentMethods(config),
  });
}

export function buildButtonAllowedPaymentMethods(
  config: ResolvedVqGooglePayConfig,
): string {
  return JSON.stringify(buttonPaymentMethods(config));
}

export function buildPaymentRequest(
  config: ResolvedVqGooglePayConfig,
  request: GooglePayPaymentRequest,
): string {
  validatePaymentRequest(request);
  const currency = request.amount.currency ?? config.defaults.currency;
  const countryCode = request.countryCode ?? config.defaults.countryCode;

  return JSON.stringify({
    apiVersion: API_VERSION,
    apiVersionMinor: API_VERSION_MINOR,
    merchantInfo: {
      merchantId: config.merchant.identifier,
      merchantName: config.merchant.displayName,
    },
    allowedPaymentMethods: [cardPaymentMethod(config, true)],
    transactionInfo: {
      totalPriceStatus: 'FINAL',
      totalPrice: request.amount.value,
      totalPriceLabel: request.totalPriceLabel ?? 'Total',
      currencyCode: currency,
      countryCode,
      checkoutOption: 'COMPLETE_IMMEDIATE_PURCHASE',
    },
  });
}

function buttonPaymentMethods(config: ResolvedVqGooglePayConfig) {
  return [cardPaymentMethod(config, false)];
}

export function validatePaymentRequest(request: GooglePayPaymentRequest): void {
  try {
    assertExactKeys(request, [
      'orderNumber',
      'amount',
      'countryCode',
      'totalPriceLabel',
    ]);
    assertExactKeys(request.amount, ['value', 'currency']);
    assertSafeText(request.orderNumber, 1, 50);
    assertMoney(request.amount.value);
    if (
      request.amount.currency !== undefined &&
      !/^[A-Z]{3}$/.test(request.amount.currency)
    ) {
      throw new Error('currency is invalid');
    }
    if (
      request.countryCode !== undefined &&
      !/^[A-Z]{2}$/.test(request.countryCode)
    ) {
      throw new Error('countryCode is invalid');
    }
    if (request.totalPriceLabel !== undefined)
      assertSafeText(request.totalPriceLabel, 1, 50);
  } catch (error) {
    throw new VqWalletError(
      'INVALID_PAYMENT_REQUEST',
      'Google Pay payment request is invalid.',
      {
        orderNumber:
          typeof request?.orderNumber === 'string'
            ? request.orderNumber
            : undefined,
        cause: error,
      },
    );
  }
}

function cardPaymentMethod(
  config: ResolvedVqGooglePayConfig,
  tokenized: boolean,
) {
  return {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: config.paymentMethod.allowedAuthMethods,
      allowedCardNetworks: config.paymentMethod.allowedCardNetworks,
    },
    ...(tokenized
      ? {
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: config.gateway.name,
              gatewayMerchantId: config.gateway.merchantId,
            },
          },
        }
      : {}),
  };
}

function assertExactKeys(value: object, keys: readonly string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new Error('unknown field');
}

function assertSafeText(
  value: unknown,
  minimum: number,
  maximum: number,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length < minimum ||
    value.length > maximum ||
    hasControlCharacter(value)
  ) {
    throw new Error('text is invalid');
  }
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function assertMoney(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(value)
  ) {
    throw new Error('amount is invalid');
  }
  const [whole = '0', fraction = ''] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents < 1n || cents > 99_999_999n)
    throw new Error('amount is out of range');
}
