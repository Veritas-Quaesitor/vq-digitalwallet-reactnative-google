import {
  createVqGooglePay,
  isVqWalletError,
  VqGooglePayButton,
  type GooglePayPaymentResult,
} from 'vq-digitalwallet-reactnative-google';

const googlePay = createVqGooglePay({
  merchant: {
    identifier: '12345678901234567890',
    displayName: 'Merchant Store',
  },
  gateway: {
    name: 'merchantGateway',
    merchantId: 'merchantGatewayAccount',
  },
  defaults: {
    countryCode: 'ZA',
    currency: 'ZAR',
  },
  observability: {
    eventSink: { emit: () => undefined },
  },
});

declare function sendToMerchantBackend(
  result: GooglePayPaymentResult,
): Promise<void>;

export async function payWithoutManagedButton(): Promise<void> {
  try {
    const result = await googlePay.pay({
      orderNumber: 'ORDER-HEADLESS-1',
      amount: { value: '159.00' },
    });
    await sendToMerchantBackend(result);
  } catch (error) {
    if (isVqWalletError(error)) {
      void error.code;
      void error.category;
      void error.retryable;
    }
  }
}

export function ManagedCheckout() {
  return (
    <VqGooglePayButton
      buttonType="checkout"
      client={googlePay}
      cornerRadius={12}
      onPayment={sendToMerchantBackend}
      payment={{
        orderNumber: 'ORDER-MANAGED-1',
        amount: { value: '159.00', currency: 'ZAR' },
      }}
      theme="light"
    />
  );
}

export function MerchantControlledPress() {
  return <VqGooglePayButton onPress={() => undefined} />;
}

// @ts-expect-error managed mode requires a payment request
export const invalidManagedButton = <VqGooglePayButton client={googlePay} />;

const invalidNumericPayment = {
  orderNumber: 'ORDER-2',
  amount: { value: 159 },
};
// @ts-expect-error money must remain an exact decimal string
void googlePay.pay(invalidNumericPayment);
