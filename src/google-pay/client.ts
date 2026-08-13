import { Platform } from 'react-native';
import NativeVqGooglePay from '../NativeVqGooglePay';
import { resolveConfig } from '../core/config';
import type {
  GooglePayAvailability,
  GooglePayEnvironment,
  GooglePayPaymentRequest,
  GooglePayPaymentResult,
  VqGooglePayClient,
  VqGooglePayConfig,
} from '../core/contracts';
import { mapNativeError, VqWalletError } from '../core/errors';
import { createObservability } from '../core/observability';
import { SDK_VERSION } from '../version';
import {
  buildButtonAllowedPaymentMethods,
  buildPaymentRequest,
  buildReadinessRequest,
} from './request-builder';

let requestSequence = 0;
const buttonPaymentMethods = new WeakMap<VqGooglePayClient, string>();

export function createVqGooglePay(
  config: VqGooglePayConfig,
): VqGooglePayClient {
  const resolved = resolveConfig(config);
  const observability = createObservability(resolved.observability);

  const client: VqGooglePayClient = Object.freeze({
    async checkAvailability(): Promise<GooglePayAvailability> {
      const startedAt = observability.now();
      if (Platform.OS !== 'android') {
        return reportAvailability(
          { status: 'unsupported', reason: 'android-required' },
          startedAt,
        );
      }
      if (NativeVqGooglePay === null || NativeVqGooglePay === undefined) {
        return reportAvailability(
          { status: 'unsupported', reason: 'native-module-unavailable' },
          startedAt,
        );
      }
      try {
        const available = await NativeVqGooglePay.checkAvailability(
          buildReadinessRequest(resolved),
        );
        return reportAvailability(
          available
            ? { status: 'available' }
            : { status: 'unavailable', reason: 'not-ready' },
          startedAt,
        );
      } catch (error) {
        const mapped = mapNativeError(error);
        if (mapped.code === 'GOOGLE_PLAY_SERVICES_UNAVAILABLE') {
          return reportAvailability(
            {
              status: 'unavailable',
              reason: 'google-play-services-unavailable',
            },
            startedAt,
          );
        }
        if (mapped.code === 'NATIVE_MODULE_UNAVAILABLE') {
          return reportAvailability(
            { status: 'unsupported', reason: 'native-module-unavailable' },
            startedAt,
          );
        }
        observability.emit({
          type: 'availability_checked',
          status: 'failed',
          durationMs: Math.max(0, observability.now() - startedAt),
          sdkVersion: SDK_VERSION,
          errorCode: mapped.code,
        });
        throw mapped;
      }

      function reportAvailability(
        availability: GooglePayAvailability,
        started: number,
      ): GooglePayAvailability {
        observability.emit({
          type: 'availability_checked',
          status: availability.status,
          ...('reason' in availability ? { reason: availability.reason } : {}),
          durationMs: Math.max(0, observability.now() - started),
          sdkVersion: SDK_VERSION,
        });
        return availability;
      }
    },

    async pay(
      request: GooglePayPaymentRequest,
    ): Promise<GooglePayPaymentResult> {
      const sdkRequestId = createRequestId();
      const orderNumber =
        typeof request?.orderNumber === 'string' ? request.orderNumber : '';
      const startedAt = observability.now();
      observability.emit({
        type: 'payment_started',
        orderNumber,
        sdkRequestId,
        sdkVersion: SDK_VERSION,
      });
      try {
        if (Platform.OS !== 'android') {
          throw new VqWalletError(
            'UNSUPPORTED_PLATFORM',
            'Google Pay requires Android.',
            {
              sdkRequestId,
              orderNumber,
            },
          );
        }
        if (NativeVqGooglePay === null || NativeVqGooglePay === undefined) {
          throw new VqWalletError(
            'NATIVE_MODULE_UNAVAILABLE',
            'The Google Pay native module is unavailable.',
            {
              sdkRequestId,
              orderNumber,
            },
          );
        }
        const rawToken = await NativeVqGooglePay.requestPayment(
          buildPaymentRequest(resolved, request),
        );
        if (rawToken.length === 0) {
          throw new VqWalletError(
            'PLATFORM_ERROR',
            'Google Pay could not complete the request.',
            { sdkRequestId, orderNumber },
          );
        }
        let paymentToken: string;
        try {
          paymentToken = NativeVqGooglePay.encodePaymentToken(
            JSON.stringify(rawToken),
          );
        } catch (error) {
          throw new VqWalletError(
            'TOKEN_ENCODING_FAILED',
            'The Google Pay token could not be encoded.',
            { sdkRequestId, orderNumber, cause: error },
          );
        }
        const result = {
          paymentToken,
          orderNumber,
          sdkRequestId,
          googlePayEnvironment: getGooglePayEnvironment(),
        };
        observability.emit({
          type: 'payment_completed',
          outcome: 'succeeded',
          orderNumber,
          sdkRequestId,
          sdkVersion: SDK_VERSION,
          durationMs: Math.max(0, observability.now() - startedAt),
        });
        return result;
      } catch (error) {
        const mapped =
          error instanceof VqWalletError
            ? error
            : mapNativeError(error, { sdkRequestId, orderNumber });
        observability.emit({
          type: 'payment_completed',
          outcome: 'failed',
          orderNumber,
          sdkRequestId,
          sdkVersion: SDK_VERSION,
          durationMs: Math.max(0, observability.now() - startedAt),
          errorCode: mapped.code,
        });
        throw mapped;
      }
    },
  });
  buttonPaymentMethods.set(client, buildButtonAllowedPaymentMethods(resolved));
  return client;
}

export function getGooglePayEnvironment(): GooglePayEnvironment {
  if (Platform.OS !== 'android') {
    throw new VqWalletError(
      'UNSUPPORTED_PLATFORM',
      'Google Pay requires Android.',
    );
  }
  if (NativeVqGooglePay === null || NativeVqGooglePay === undefined) {
    throw new VqWalletError(
      'NATIVE_MODULE_UNAVAILABLE',
      'The Google Pay native module is unavailable.',
    );
  }
  const environment = NativeVqGooglePay.getGooglePayEnvironment();
  if (environment !== 'TEST' && environment !== 'PRODUCTION') {
    throw new VqWalletError(
      'PLATFORM_ERROR',
      'The Google Pay build environment is invalid.',
    );
  }
  return environment;
}

export function getButtonAllowedPaymentMethods(
  client: VqGooglePayClient,
): string | undefined {
  return buttonPaymentMethods.get(client);
}

function createRequestId(): string {
  requestSequence += 1;
  return `vq-${Date.now().toString(36)}-${requestSequence.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
