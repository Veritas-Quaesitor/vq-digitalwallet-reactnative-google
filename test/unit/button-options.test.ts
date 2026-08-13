import { resolveButtonOptions } from '../../src/ui/button-options';

describe('Google Pay button options', () => {
  it('uses and freezes the approved defaults', () => {
    const options = resolveButtonOptions({});

    expect(options).toEqual({
      buttonType: 'pay',
      cornerRadius: 100,
      theme: 'dark',
    });
    expect(Object.isFrozen(options)).toBe(true);
  });

  it('accepts supported Google Pay presentation options', () => {
    expect(
      resolveButtonOptions({
        buttonType: 'checkout',
        cornerRadius: 12,
        theme: 'light',
      }),
    ).toEqual({
      buttonType: 'checkout',
      cornerRadius: 12,
      theme: 'light',
    });
  });

  it.each([
    { buttonType: 'donate' },
    { theme: 'automatic' },
    { cornerRadius: -1 },
    { cornerRadius: 1.5 },
    { cornerRadius: 101 },
  ])('rejects unsupported presentation option %#', (options) => {
    expect(() => resolveButtonOptions(options as never)).toThrow();
  });
});
