import type {
  GooglePayAuthMethod,
  GooglePayCardNetwork,
  ResolvedVqGooglePayConfig,
  VqGooglePayConfig,
} from './contracts';
import { VqWalletError } from './errors';

const DEFAULT_NETWORKS: readonly GooglePayCardNetwork[] = [
  'MASTERCARD',
  'VISA',
];
const DEFAULT_AUTH_METHODS: readonly GooglePayAuthMethod[] = [
  'PAN_ONLY',
  'CRYPTOGRAM_3DS',
];
const NETWORKS = new Set<GooglePayCardNetwork>([
  'AMEX',
  'DISCOVER',
  'INTERAC',
  'JCB',
  'MASTERCARD',
  'VISA',
]);
const AUTH_METHODS = new Set<GooglePayAuthMethod>([
  'PAN_ONLY',
  'CRYPTOGRAM_3DS',
]);
const ALPHANUMERIC = (value: string) => /^[A-Za-z0-9]+$/.test(value);

export function resolveConfig(
  config: VqGooglePayConfig,
): ResolvedVqGooglePayConfig {
  try {
    assertExactKeys(
      config,
      ['merchant', 'gateway', 'paymentMethod', 'defaults', 'observability'],
      'config',
    );
    assertExactKeys(config.merchant, ['identifier', 'displayName'], 'merchant');
    assertExactKeys(config.gateway, ['name', 'merchantId'], 'gateway');
    if (config.paymentMethod !== undefined) {
      assertExactKeys(
        config.paymentMethod,
        ['allowedCardNetworks', 'allowedAuthMethods'],
        'paymentMethod',
      );
    }
    if (config.defaults !== undefined) {
      assertExactKeys(config.defaults, ['countryCode', 'currency'], 'defaults');
    }
    if (config.observability !== undefined) {
      assertExactKeys(
        config.observability,
        ['logger', 'eventSink'],
        'observability',
      );
      assertOptionalMethod(config.observability.logger, 'log', 'logger');
      assertOptionalMethod(config.observability.eventSink, 'emit', 'eventSink');
    }

    assertString(
      config.merchant.identifier,
      'merchant.identifier',
      10,
      32,
      ALPHANUMERIC,
    );
    assertString(
      config.merchant.displayName,
      'merchant.displayName',
      1,
      100,
      isSafeText,
    );
    assertString(config.gateway.name, 'gateway.name', 1, 64, isSafeText);
    assertString(
      config.gateway.merchantId,
      'gateway.merchantId',
      1,
      128,
      isSafeText,
    );

    const networks = [
      ...(config.paymentMethod?.allowedCardNetworks ?? DEFAULT_NETWORKS),
    ];
    const authMethods = [
      ...(config.paymentMethod?.allowedAuthMethods ?? DEFAULT_AUTH_METHODS),
    ];
    assertEnumArray(networks, NETWORKS, 'allowedCardNetworks');
    assertEnumArray(authMethods, AUTH_METHODS, 'allowedAuthMethods');

    const countryCode = config.defaults?.countryCode ?? 'ZA';
    const currency = config.defaults?.currency ?? 'ZAR';
    assertPattern(countryCode, 'defaults.countryCode', /^[A-Z]{2}$/);
    assertPattern(currency, 'defaults.currency', /^[A-Z]{3}$/);

    return Object.freeze({
      merchant: Object.freeze({ ...config.merchant }),
      gateway: Object.freeze({ ...config.gateway }),
      paymentMethod: Object.freeze({
        allowedCardNetworks: Object.freeze(networks),
        allowedAuthMethods: Object.freeze(authMethods),
      }),
      defaults: Object.freeze({ countryCode, currency }),
      observability: Object.freeze({ ...config.observability }),
    });
  } catch (error) {
    if (error instanceof VqWalletError) throw error;
    throw new VqWalletError(
      'INVALID_CONFIGURATION',
      'Google Pay configuration is invalid.',
      {
        cause: error,
      },
    );
  }
}

function assertOptionalMethod(
  value: unknown,
  method: string,
  field: string,
): void {
  if (
    value !== undefined &&
    (typeof value !== 'object' ||
      value === null ||
      !(method in value) ||
      typeof value[method as keyof typeof value] !== 'function')
  ) {
    throw new Error(`observability.${field} is invalid`);
  }
}

function assertExactKeys(
  value: object,
  allowedKeys: readonly string[],
  field: string,
): void {
  const unknown = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknown !== undefined)
    throw new Error(`${field}.${unknown} is not supported`);
}

function assertString(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  predicate: (value: string) => boolean,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length < minimum ||
    value.length > maximum ||
    !predicate(value)
  ) {
    throw new Error(`${field} is invalid`);
  }
}

function isSafeText(value: string): boolean {
  return [...value].every((character) => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  });
}

function assertPattern(value: string, field: string, pattern: RegExp): void {
  if (!pattern.test(value)) throw new Error(`${field} is invalid`);
}

function assertEnumArray<T extends string>(
  values: readonly T[],
  allowed: ReadonlySet<T>,
  field: string,
): void {
  if (values.length === 0 || new Set(values).size !== values.length) {
    throw new Error(`${field} must be non-empty and contain no duplicates`);
  }
  if (values.some((value) => !allowed.has(value)))
    throw new Error(`${field} is invalid`);
}
