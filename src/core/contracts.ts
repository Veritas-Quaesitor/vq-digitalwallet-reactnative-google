export type GooglePayCardNetwork =
  | 'AMEX'
  | 'DISCOVER'
  | 'INTERAC'
  | 'JCB'
  | 'MASTERCARD'
  | 'VISA';

export type GooglePayAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';

export type GooglePayEnvironment = 'TEST' | 'PRODUCTION';

export type GooglePayButtonType =
  | 'buy'
  | 'checkout'
  | 'order'
  | 'pay'
  | 'plain';

export type GooglePayButtonTheme = 'dark' | 'light';

export interface Money {
  value: string;
  currency?: string;
}

export interface VqGooglePayConfig {
  merchant: {
    identifier: string;
    displayName: string;
  };
  gateway: {
    name: string;
    merchantId: string;
  };
  paymentMethod?: {
    allowedCardNetworks?: readonly GooglePayCardNetwork[];
    allowedAuthMethods?: readonly GooglePayAuthMethod[];
  };
  defaults?: {
    countryCode?: string;
    currency?: string;
  };
  observability?: {
    logger?: VqWalletLogger;
    eventSink?: VqGooglePayEventSink;
  };
}

export interface GooglePayPaymentRequest {
  orderNumber: string;
  amount: Money;
  countryCode?: string;
  totalPriceLabel?: string;
}

export type GooglePayAvailability =
  | { status: 'available' }
  | {
      status: 'unavailable';
      reason: 'not-ready' | 'google-play-services-unavailable';
    }
  | {
      status: 'unsupported';
      reason: 'android-required' | 'native-module-unavailable';
    };

export interface GooglePayPaymentResult {
  paymentToken: string;
  orderNumber: string;
  sdkRequestId: string;
  googlePayEnvironment: GooglePayEnvironment;
}

export interface VqGooglePayClient {
  checkAvailability(): Promise<GooglePayAvailability>;
  pay(request: GooglePayPaymentRequest): Promise<GooglePayPaymentResult>;
}

export type VqWalletErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'INVALID_PAYMENT_REQUEST'
  | 'UNSUPPORTED_PLATFORM'
  | 'NATIVE_MODULE_UNAVAILABLE'
  | 'GOOGLE_PLAY_SERVICES_UNAVAILABLE'
  | 'GOOGLE_PAY_UNAVAILABLE'
  | 'PAYMENT_IN_PROGRESS'
  | 'NO_FOREGROUND_ACTIVITY'
  | 'ACTIVITY_RECREATED'
  | 'USER_CANCELED'
  | 'DEVELOPER_ERROR'
  | 'PLATFORM_ERROR'
  | 'TOKEN_ENCODING_FAILED'
  | 'UNKNOWN_ERROR';

export type VqWalletErrorCategory =
  | 'availability'
  | 'configuration'
  | 'lifecycle'
  | 'payment'
  | 'platform'
  | 'token'
  | 'unknown';

export type VqGooglePayEvent =
  | {
      readonly type: 'availability_checked';
      readonly status: GooglePayAvailability['status'] | 'failed';
      readonly reason?:
        | 'android-required'
        | 'google-play-services-unavailable'
        | 'native-module-unavailable'
        | 'not-ready';
      readonly durationMs: number;
      readonly sdkVersion: string;
      readonly errorCode?: VqWalletErrorCode;
    }
  | {
      readonly type: 'payment_started';
      readonly orderNumber: string;
      readonly sdkRequestId: string;
      readonly sdkVersion: string;
    }
  | {
      readonly type: 'payment_completed';
      readonly outcome: 'failed' | 'succeeded';
      readonly orderNumber: string;
      readonly sdkRequestId: string;
      readonly sdkVersion: string;
      readonly durationMs: number;
      readonly errorCode?: VqWalletErrorCode;
    };

export interface VqGooglePayEventSink {
  emit(event: VqGooglePayEvent): void;
}

export interface VqWalletLogger {
  log(entry: {
    readonly level: 'info' | 'warn';
    readonly event: VqGooglePayEvent;
  }): void;
}

export interface ResolvedVqGooglePayConfig {
  readonly merchant: Readonly<VqGooglePayConfig['merchant']>;
  readonly gateway: Readonly<VqGooglePayConfig['gateway']>;
  readonly paymentMethod: {
    readonly allowedCardNetworks: readonly GooglePayCardNetwork[];
    readonly allowedAuthMethods: readonly GooglePayAuthMethod[];
  };
  readonly defaults: {
    readonly countryCode: string;
    readonly currency: string;
  };
  readonly observability: {
    readonly logger?: VqWalletLogger;
    readonly eventSink?: VqGooglePayEventSink;
  };
}
