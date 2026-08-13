import type {
  GooglePayButtonTheme,
  GooglePayButtonType,
} from '../core/contracts';

const BUTTON_TYPES = new Set<GooglePayButtonType>([
  'buy',
  'checkout',
  'order',
  'pay',
  'plain',
]);
const BUTTON_THEMES = new Set<GooglePayButtonTheme>(['dark', 'light']);

export interface ResolvedGooglePayButtonOptions {
  readonly buttonType: GooglePayButtonType;
  readonly cornerRadius: number;
  readonly theme: GooglePayButtonTheme;
}

export function resolveButtonOptions(options: {
  buttonType?: GooglePayButtonType;
  cornerRadius?: number;
  theme?: GooglePayButtonTheme;
}): ResolvedGooglePayButtonOptions {
  const buttonType = options.buttonType ?? 'pay';
  const cornerRadius = options.cornerRadius ?? 100;
  const theme = options.theme ?? 'dark';

  if (!BUTTON_TYPES.has(buttonType)) {
    throw new TypeError('buttonType is invalid.');
  }
  if (!BUTTON_THEMES.has(theme)) {
    throw new TypeError('theme is invalid.');
  }
  if (
    !Number.isInteger(cornerRadius) ||
    cornerRadius < 0 ||
    cornerRadius > 100
  ) {
    throw new RangeError('cornerRadius must be an integer from 0 to 100.');
  }

  return Object.freeze({ buttonType, cornerRadius, theme });
}
