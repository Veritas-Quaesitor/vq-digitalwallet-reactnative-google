import type { VqWalletErrorCategory, VqWalletErrorCode } from './contracts';

const RETRYABLE_CODES = new Set<VqWalletErrorCode>([
  'GOOGLE_PAY_UNAVAILABLE',
  'PLATFORM_ERROR',
  'UNKNOWN_ERROR',
]);

export class VqWalletError extends Error {
  readonly code: VqWalletErrorCode;
  readonly category: VqWalletErrorCategory;
  readonly retryable: boolean;
  readonly sdkRequestId?: string;
  readonly orderNumber?: string;

  constructor(
    code: VqWalletErrorCode,
    message: string,
    context: {
      sdkRequestId?: string;
      orderNumber?: string;
      cause?: unknown;
    } = {},
  ) {
    super(
      message,
      context.cause === undefined ? undefined : { cause: context.cause },
    );
    this.name = 'VqWalletError';
    this.code = code;
    this.category = categoryFor(code);
    this.retryable = RETRYABLE_CODES.has(code);
    this.sdkRequestId = context.sdkRequestId;
    this.orderNumber = context.orderNumber;
  }
}

function categoryFor(code: VqWalletErrorCode): VqWalletErrorCategory {
  const categories: Record<VqWalletErrorCode, VqWalletErrorCategory> = {
    INVALID_CONFIGURATION: 'configuration',
    INVALID_PAYMENT_REQUEST: 'payment',
    UNSUPPORTED_PLATFORM: 'platform',
    NATIVE_MODULE_UNAVAILABLE: 'platform',
    GOOGLE_PLAY_SERVICES_UNAVAILABLE: 'availability',
    GOOGLE_PAY_UNAVAILABLE: 'availability',
    PAYMENT_IN_PROGRESS: 'lifecycle',
    NO_FOREGROUND_ACTIVITY: 'lifecycle',
    ACTIVITY_RECREATED: 'lifecycle',
    USER_CANCELED: 'payment',
    DEVELOPER_ERROR: 'configuration',
    PLATFORM_ERROR: 'platform',
    TOKEN_ENCODING_FAILED: 'token',
    UNKNOWN_ERROR: 'unknown',
  };
  return categories[code];
}

export function isVqWalletError(error: unknown): error is VqWalletError {
  return error instanceof VqWalletError;
}

export function mapNativeError(
  error: unknown,
  context: { sdkRequestId?: string; orderNumber?: string } = {},
): VqWalletError {
  const nativeCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'UNKNOWN_ERROR';
  const code = isVqWalletErrorCode(nativeCode) ? nativeCode : 'UNKNOWN_ERROR';
  return new VqWalletError(code, safeMessageFor(code), {
    ...context,
    cause: error,
  });
}

function isVqWalletErrorCode(value: string): value is VqWalletErrorCode {
  return [
    'INVALID_CONFIGURATION',
    'INVALID_PAYMENT_REQUEST',
    'UNSUPPORTED_PLATFORM',
    'NATIVE_MODULE_UNAVAILABLE',
    'GOOGLE_PLAY_SERVICES_UNAVAILABLE',
    'GOOGLE_PAY_UNAVAILABLE',
    'PAYMENT_IN_PROGRESS',
    'NO_FOREGROUND_ACTIVITY',
    'ACTIVITY_RECREATED',
    'USER_CANCELED',
    'DEVELOPER_ERROR',
    'PLATFORM_ERROR',
    'TOKEN_ENCODING_FAILED',
    'UNKNOWN_ERROR',
  ].includes(value);
}

function safeMessageFor(code: VqWalletErrorCode): string {
  const messages: Record<VqWalletErrorCode, string> = {
    INVALID_CONFIGURATION: 'Google Pay configuration is invalid.',
    INVALID_PAYMENT_REQUEST: 'Google Pay payment request is invalid.',
    UNSUPPORTED_PLATFORM: 'Google Pay requires Android.',
    NATIVE_MODULE_UNAVAILABLE: 'The Google Pay native module is unavailable.',
    GOOGLE_PLAY_SERVICES_UNAVAILABLE: 'Google Play services are unavailable.',
    GOOGLE_PAY_UNAVAILABLE: 'Google Pay is unavailable on this device.',
    PAYMENT_IN_PROGRESS: 'A Google Pay payment is already in progress.',
    NO_FOREGROUND_ACTIVITY: 'A foreground Android activity is required.',
    ACTIVITY_RECREATED: 'The Android activity changed during payment.',
    USER_CANCELED: 'The user canceled Google Pay.',
    DEVELOPER_ERROR: 'The Google Pay request configuration was rejected.',
    PLATFORM_ERROR: 'Google Pay could not complete the request.',
    TOKEN_ENCODING_FAILED: 'The Google Pay token could not be encoded.',
    UNKNOWN_ERROR: 'An unexpected Google Pay error occurred.',
  };
  return messages[code];
}
