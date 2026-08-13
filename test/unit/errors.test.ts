import {
  isVqWalletError,
  mapNativeError,
  VqWalletError,
} from '../../src/core/errors';

describe('VqWalletError', () => {
  it('maps only stable native codes and retains safe identities', () => {
    const error = mapNativeError(
      { code: 'USER_CANCELED', message: 'sensitive native detail' },
      { sdkRequestId: 'sdk-1', orderNumber: 'ORDER-1' },
    );

    expect(error).toEqual(
      expect.objectContaining({
        code: 'USER_CANCELED',
        category: 'payment',
        message: 'The user canceled Google Pay.',
        retryable: false,
        sdkRequestId: 'sdk-1',
        orderNumber: 'ORDER-1',
      }),
    );
    expect(error.message).not.toContain('sensitive');
    expect(isVqWalletError(error)).toBe(true);
  });

  it('collapses unrecognized native errors', () => {
    const error = mapNativeError({ code: 'UNSAFE_NEW_CODE' });
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.retryable).toBe(true);
    expect(error.category).toBe('unknown');
  });

  it('recognizes only SDK error instances', () => {
    expect(
      isVqWalletError(new VqWalletError('USER_CANCELED', 'Canceled')),
    ).toBe(true);
    expect(isVqWalletError(new Error('Canceled'))).toBe(false);
  });
});
