import type { VqGooglePayEvent } from '../../src/core/contracts';
import { createObservability } from '../../src/core/observability';

const event: VqGooglePayEvent = {
  type: 'payment_completed',
  outcome: 'failed',
  orderNumber: 'ORDER-1',
  sdkRequestId: 'sdk-1',
  sdkVersion: '0.1.0',
  durationMs: 12,
  errorCode: 'USER_CANCELED',
};

describe('redacted observability', () => {
  it('delivers one frozen event to each configured adapter', () => {
    const events: VqGooglePayEvent[] = [];
    const entries: unknown[] = [];
    const observability = createObservability({
      eventSink: { emit: (value) => events.push(value) },
      logger: { log: (entry) => entries.push(entry) },
    });

    observability.emit(event);

    expect(events).toHaveLength(1);
    expect(Object.isFrozen(events[0])).toBe(true);
    expect(entries).toEqual([{ level: 'warn', event }]);
  });

  it('uses info for non-failure events and exposes an injectable clock', () => {
    const entries: unknown[] = [];
    const observability = createObservability(
      { logger: { log: (entry) => entries.push(entry) } },
      () => 123,
    );
    const availability: VqGooglePayEvent = {
      type: 'availability_checked',
      status: 'available',
      durationMs: 1,
      sdkVersion: '0.1.0',
    };

    observability.emit(availability);

    expect(observability.now()).toBe(123);
    expect(entries).toEqual([{ level: 'info', event: availability }]);
  });

  it('never lets merchant observability change an SDK outcome', () => {
    const observability = createObservability({
      eventSink: {
        emit: () => {
          throw new Error('merchant sink failed');
        },
      },
      logger: {
        log: () => {
          throw new Error('merchant logger failed');
        },
      },
    });

    expect(() => observability.emit(event)).not.toThrow();
  });
});
