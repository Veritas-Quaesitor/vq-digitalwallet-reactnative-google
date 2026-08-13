import type { ResolvedVqGooglePayConfig, VqGooglePayEvent } from './contracts';

export interface VqObservability {
  now(): number;
  emit(event: VqGooglePayEvent): void;
}

export function createObservability(
  config: ResolvedVqGooglePayConfig['observability'],
  now: () => number = Date.now,
): VqObservability {
  return Object.freeze({
    now,
    emit(event: VqGooglePayEvent): void {
      const frozenEvent = Object.freeze({ ...event }) as VqGooglePayEvent;
      safely(() => config.eventSink?.emit(frozenEvent));
      safely(() =>
        config.logger?.log({
          level:
            (frozenEvent.type === 'payment_completed' &&
              frozenEvent.outcome === 'failed') ||
            (frozenEvent.type === 'availability_checked' &&
              frozenEvent.status === 'failed')
              ? 'warn'
              : 'info',
          event: frozenEvent,
        }),
      );
    },
  });
}

function safely(callback: () => void): void {
  try {
    callback();
  } catch {
    // Merchant observability must never alter a payment outcome.
  }
}
