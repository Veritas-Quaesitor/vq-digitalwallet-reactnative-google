import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type {
  GooglePayAvailability,
  GooglePayButtonTheme,
  GooglePayButtonType,
  GooglePayPaymentRequest,
  GooglePayPaymentResult,
  VqGooglePayClient,
} from './core/contracts';
import type { VqWalletError } from './core/errors';
import { getButtonAllowedPaymentMethods } from './google-pay/client';
import { resolveButtonOptions } from './ui/button-options';
import VqGooglePayButtonNativeComponent from './VqGooglePayButtonNativeComponent';

interface VqGooglePayButtonBaseProps {
  buttonType?: GooglePayButtonType;
  cornerRadius?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: GooglePayButtonTheme;
}

interface VqGooglePayManagedButtonProps extends VqGooglePayButtonBaseProps {
  client: VqGooglePayClient;
  onAvailabilityChange?: (availability: GooglePayAvailability) => void;
  onError?: (error: VqWalletError) => void;
  onPayment?: (result: GooglePayPaymentResult) => void;
  onPress?: () => void;
  payment: GooglePayPaymentRequest;
}

interface VqGooglePayPressButtonProps extends VqGooglePayButtonBaseProps {
  client?: never;
  onAvailabilityChange?: never;
  onError?: never;
  onPayment?: never;
  onPress: () => void;
  payment?: never;
}

export type VqGooglePayButtonProps =
  | VqGooglePayManagedButtonProps
  | VqGooglePayPressButtonProps;

export default function VqGooglePayButton({
  buttonType = 'pay',
  client,
  cornerRadius = 100,
  disabled = false,
  onAvailabilityChange,
  onError,
  onPayment,
  onPress,
  payment,
  style,
  theme = 'dark',
}: VqGooglePayButtonProps) {
  const buttonOptions = resolveButtonOptions({
    buttonType,
    cornerRadius,
    theme,
  });
  const [availability, setAvailability] =
    useState<GooglePayAvailability | null>(
      client === undefined ? { status: 'available' } : null,
    );
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const paymentInProgressRef = useRef(false);
  const availabilityCallback = useRef(onAvailabilityChange);
  const errorCallback = useRef(onError);
  availabilityCallback.current = onAvailabilityChange;
  errorCallback.current = onError;

  useEffect(() => {
    if (client === undefined) return undefined;
    let active = true;
    setAvailability(null);
    client.checkAvailability().then(
      (result) => {
        if (!active) return;
        setAvailability(result);
        availabilityCallback.current?.(result);
      },
      (error: VqWalletError) => {
        if (!active) return;
        errorCallback.current?.(error);
      },
    );
    return () => {
      active = false;
    };
  }, [client]);

  const handlePress = useCallback(() => {
    if (disabled || paymentInProgressRef.current) return;
    onPress?.();
    if (client === undefined || payment === undefined) return;

    paymentInProgressRef.current = true;
    setPaymentInProgress(true);
    client.pay(payment).then(
      (result) => {
        paymentInProgressRef.current = false;
        setPaymentInProgress(false);
        onPayment?.(result);
      },
      (error: VqWalletError) => {
        paymentInProgressRef.current = false;
        setPaymentInProgress(false);
        onError?.(error);
      },
    );
  }, [client, disabled, onError, onPayment, onPress, payment]);

  if (availability?.status !== 'available') return null;
  const effectivelyDisabled = disabled || paymentInProgress;
  const allowedPaymentMethods =
    client === undefined
      ? DEFAULT_BUTTON_ALLOWED_PAYMENT_METHODS
      : (getButtonAllowedPaymentMethods(client) ??
        DEFAULT_BUTTON_ALLOWED_PAYMENT_METHODS);
  // Google's PayButton applies these options during initialize(). A key change
  // recreates only the native button when its initialization options change.
  const nativeButtonKey = [
    buttonOptions.buttonType,
    buttonOptions.theme,
    String(buttonOptions.cornerRadius),
    allowedPaymentMethods,
  ].join('|');

  return (
    <VqGooglePayButtonNativeComponent
      accessibilityRole="button"
      accessibilityState={{
        disabled: effectivelyDisabled,
        busy: paymentInProgress,
      }}
      allowedPaymentMethods={allowedPaymentMethods}
      buttonTheme={buttonOptions.theme}
      buttonType={buttonOptions.buttonType}
      cornerRadius={buttonOptions.cornerRadius}
      key={nativeButtonKey}
      onGooglePayPress={() => handlePress()}
      pointerEvents={effectivelyDisabled ? 'none' : 'auto'}
      style={[styles.button, effectivelyDisabled && styles.disabled, style]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 152,
    height: 48,
  },
  disabled: {
    opacity: 0.4,
  },
});

const DEFAULT_BUTTON_ALLOWED_PAYMENT_METHODS =
  '[{"type":"CARD","parameters":{"allowedAuthMethods":["PAN_ONLY","CRYPTOGRAM_3DS"],"allowedCardNetworks":["MASTERCARD","VISA"]}}]';
