# 🚀 VQ React Native Google Pay SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Android](https://img.shields.io/badge/platform-Android-3DDC84.svg)](#supported-environment)
[![React Native](https://img.shields.io/badge/React%20Native-0.85--0.86-61DAFB.svg)](#supported-environment)
[![Google Pay](https://img.shields.io/badge/Google%20Pay-Android-4285F4.svg)](#managed-button-quick-start)

Android-only React Native SDK for merchants accepting Google Pay through Veritas Quaesitor.

> **Release status:** `0.1.0` is under gated development and is not production-ready. SDK package integrity, isolated-consumer installation, and Google Pay TEST flow are verified. UAT validation, production approval/signing, and release sign-off remain release-gate work.

## ✨ Features

- 📱 Native Android Google Pay sheet and Google-backed PayButton for React Native
- 🧩 Typed merchant configuration and payment input validation
- 🔐 Exact opaque-token transport contract with no mobile storage or decoding
- 🛡️ Safe structured errors and opt-in redacted observability
- 🔄 Runtime button presentation options; immutable build-time Google environment

## 📚 In this guide

[Install](#install-the-verified-package) · [Android setup](#android-project-checklist) · [TEST or PRODUCTION](#select-google-pay-test-or-production) · [Quick start](#managed-button-quick-start) · [Backend handoff](#send-the-result-to-the-merchant-backend) · [Troubleshooting](#operating-caveats-and-troubleshooting)

## Supported environment

- React Native `0.85.x` and `0.86.x`, New Architecture only
- React `19.x`
- Android API 23 or newer; compile SDK 36 or newer
- JDK 17 baseline for Android builds; newer compatible JDKs may be used when supported by the merchant application's Gradle and React Native stack
- Public source repository and public GitHub Release `.tgz` delivery
- No public npm publication
- Google Play Services Wallet `20.0.0`

Expo Go, React Native's legacy architecture, iOS, and Apple Pay are not supported by this package.

## Install the verified package

From the GitHub Release asset for the selected SDK version:

```shell
npm install ./vq-digitalwallet-reactnative-google-0.1.0.tgz
```

The clean-consumer proof has passed: merchants install one React Native package; Metro bundles its JavaScript and React Native autolinking compiles its Kotlin Android implementation. Cloning public source is not the supported merchant-installation route.

## Android project checklist

Before installing, confirm that the merchant application is an Android React
Native application using the New Architecture and the supported versions above.
The SDK targets Java 17 bytecode. JDK 17 is the tested baseline; a newer JDK
may be used where the merchant application's Gradle and React Native stack
supports it. The Android build must have `minSdkVersion` 23 or newer and compile
with Android SDK 36 or newer.

Install the supplied artifact at the application root, then perform a native
Android rebuild:

```shell
npm install ./vq-digitalwallet-reactnative-google-0.1.0.tgz
npx react-native run-android
```

React Native autolinking discovers the Kotlin implementation. Do not manually
edit `MainApplication`, register a package, copy Kotlin files, or add the
Google Wallet dependency yourself. A JavaScript-only refresh is not sufficient
after the first installation or after changing the Google Pay environment.

## Select Google Pay TEST or PRODUCTION

Set the environment in the merchant application's `android/gradle.properties`:

```properties
VQ_GOOGLE_PAY_ENVIRONMENT=TEST
```

Allowed values are exactly `TEST` and `PRODUCTION`. The safe default is `TEST`. CI can set the same Gradle property without editing a file:

```shell
ORG_GRADLE_PROJECT_VQ_GOOGLE_PAY_ENVIRONMENT=PRODUCTION ./gradlew bundleRelease
```

The environment is immutable in the built APK/AAB. Changing it requires rebuilding the merchant application, but never requires editing or rebuilding this SDK's source. Only use `PRODUCTION` after the Android application and signing identity have Google production approval.

## Managed-button quick start

```tsx
import {
  createVqGooglePay,
  type GooglePayPaymentResult,
  isVqWalletError,
  VqGooglePayButton,
} from 'vq-digitalwallet-reactnative-google';

const googlePay = createVqGooglePay({
  merchant: {
    identifier: merchantConfig.googleMerchantId,
    displayName: merchantConfig.displayName,
  },
  gateway: {
    name: merchantConfig.gatewayName,
    merchantId: merchantConfig.gatewayMerchantId,
  },
  defaults: {
    countryCode: 'ZA',
    currency: 'ZAR',
  },
});

export function GooglePayCheckout() {
  return (
    <VqGooglePayButton
      client={googlePay}
      payment={{
        orderNumber: order.id,
        amount: { value: order.total },
      }}
      onPayment={(result) => merchantBackend.processGooglePay(result)}
      onError={(error) => {
        if (isVqWalletError(error)) {
          handlePaymentError(error.code, error.sdkRequestId);
        }
      }}
    />
  );
}
```

The managed component checks readiness, renders Google's native PayButton only when available, prevents duplicate presses, and calls the same `client.pay()` operation as the programmatic path.

## Map merchant data to the SDK

Create one client at application startup from merchant onboarding/configuration
data. Supply the current checkout values per payment; do not mutate a client
after it has been created.

| Merchant application value | SDK field | Rule |
| --- | --- | --- |
| Google-approved merchant ID | `merchant.identifier` | Required 10–32 alphanumeric characters |
| Customer-visible trading name | `merchant.displayName` | Required; shown in Google Pay |
| PSP gateway name | `gateway.name` | Required onboarding value |
| PSP gateway merchant ID | `gateway.merchantId` | Required onboarding value |
| Merchant order/reference | `payment.orderNumber` | Required; preserved exactly and returned with the token |
| Checkout total | `payment.amount.value` | Positive decimal **string**, e.g. `'125.50'`; never a JavaScript number |
| Checkout currency | `payment.amount.currency` | Optional ISO-like three uppercase letter override; otherwise SDK default |
| Checkout country | `payment.countryCode` | Optional two-uppercase-letter override; otherwise SDK default |
| Display label | `payment.totalPriceLabel` | Optional customer-visible label |

`orderNumber` is not a payment-switch transaction ID. Keep the switch/API
transaction ID server-side after processing, and correlate it with the order
number and `sdkRequestId` where appropriate.

## Programmatic payment

```tsx
const availability = await googlePay.checkAvailability();
if (availability.status !== 'available') {
  return;
}

const result = await googlePay.pay({
  orderNumber: order.id,
  amount: { value: order.total, currency: order.currency },
});

await merchantBackend.processGooglePay({
  orderNumber: result.orderNumber,
  paymentToken: result.paymentToken,
  googlePayEnvironment: result.googlePayEnvironment,
});
```

`paymentToken` is the VQ transport representation `Base64(UTF8(JSON.stringify(rawGooglePayTokenString)))`. Treat it as opaque: do not decode, parse, normalize, log, retain, or retry it from mobile storage.

## Send the result to the merchant backend

The SDK deliberately does not know VQ endpoint URLs, client certificates, API
authentication, or payment-switch XML. The merchant application sends the
opaque result to its own authenticated backend over HTTPS; that backend then
uses its privately managed PSP/VQ integration.

```tsx
async function submitGooglePayResult(result: GooglePayPaymentResult) {
  await merchantApi.post('/payments/google-pay', {
    orderNumber: result.orderNumber,
    paymentToken: result.paymentToken,
    googlePayEnvironment: result.googlePayEnvironment,
    sdkRequestId: result.sdkRequestId,
  });
}
```

Pass `paymentToken` unchanged. In particular, do not Base64-decode it before
sending, stringify it again, parse its contents, or persist it for a later
retry. The backend must reject a mismatched `googlePayEnvironment`, manage
idempotency/replay protection, and handle the PSP response.

## Configuration contract

Configuration is copied, validated, and frozen when `createVqGooglePay()` is called. Unknown keys fail instead of silently changing Google Pay behaviour.

| Option                              | Set by / resolution                   | Default and validation                                  | Mutability and logging                             | Protected-contract effect                                      |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `merchant.identifier`               | Merchant at application startup       | Required; 10–32 alphanumeric characters                 | Immutable; do not log by default                   | Sets the Google merchant identity; cannot change request shape |
| `merchant.displayName`              | Merchant at application startup       | Required; 1–100 characters; no control characters       | Immutable; safe for the Google sheet, not SDK logs | Sets the user-visible merchant name                            |
| `gateway.name`                      | Merchant/PSP onboarding at startup    | Required; 1–64 characters; no control characters        | Immutable; do not log                              | Value inside protected `PAYMENT_GATEWAY` parameters            |
| `gateway.merchantId`                | Merchant/PSP onboarding at startup    | Required; 1–128 characters; no control characters       | Immutable; do not log                              | Value inside protected `PAYMENT_GATEWAY` parameters            |
| `paymentMethod.allowedCardNetworks` | Merchant acceptance policy at startup | `MASTERCARD`, `VISA`; non-empty unique supported values | Copied and immutable; safe only as policy metadata | Cannot change payment type or tokenization mode                |
| `paymentMethod.allowedAuthMethods`  | Merchant/PSP policy at startup        | `PAN_ONLY`, `CRYPTOGRAM_3DS`; non-empty unique values   | Copied and immutable; safe only as policy metadata | Cannot add unsupported Google authentication modes             |
| `defaults.countryCode`              | Merchant at startup                   | `ZA`; exactly two uppercase letters                     | Immutable; safe as non-sensitive metadata          | Used only when a payment does not override it                  |
| `defaults.currency`                 | Merchant at startup                   | `ZAR`; exactly three uppercase letters                  | Immutable; safe as non-sensitive metadata          | Used only when an amount does not provide currency             |
| `observability.logger`              | Optional merchant adapter at startup  | Object with `log(entry)`                                | Adapter reference immutable; failures are isolated | Receives redacted events only; cannot alter outcomes           |
| `observability.eventSink`           | Optional merchant adapter at startup  | Object with `emit(event)`                               | Adapter reference immutable; failures are isolated | Receives redacted events only; cannot alter outcomes           |

Every payment supplies:

| Value             | Rule                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `orderNumber`     | Required 1–50 character merchant order/reference; preserved exactly                                                |
| `amount.value`    | Required positive decimal string, maximum `999999.99`, at most two decimal places; JavaScript numbers are rejected |
| `amount.currency` | Optional three-letter uppercase override                                                                           |
| `countryCode`     | Optional two-letter uppercase override                                                                             |
| `totalPriceLabel` | Optional 1–50 character label without control characters                                                           |

Identifier responsibilities remain deliberately separate:

- `orderNumber` is the merchant's order/reference and is returned alongside the result.
- `sdkRequestId` identifies this SDK payment attempt locally and is returned for correlation; it is not inserted into the Google Pay request or token.
- `googlePayEnvironment` reports the immutable Android build environment (`TEST` or `PRODUCTION`) so a backend or QA adapter can reject an incompatible target profile.
- Google's encrypted token is opaque to the SDK. Its decrypted `messageId` is Google-generated and is not an order number or SDK request ID.
- A merchant backend must create its own payment transaction identifier when its processing API requires one; it must not substitute the order number.

The SDK always owns Google Pay API `2.0`, `CARD`, `PAYMENT_GATEWAY`, `FINAL`, `COMPLETE_IMMEDIATE_PURCHASE`, request construction, raw-token extraction, and exact token encoding. Arbitrary Google request JSON is not supported.

## Button options

`VqGooglePayButton` exposes only Google-backed presentation settings:

| Prop           | Default          | Supported values                                      |
| -------------- | ---------------- | ----------------------------------------------------- |
| `buttonType`   | `pay`            | `pay`, `buy`, `checkout`, `order`, `plain`            |
| `theme`        | `dark`           | `dark`, `light`                                       |
| `cornerRadius` | `100`            | Integer from 0–100 Android density-independent pixels |
| `disabled`     | `false`          | Boolean                                               |
| `style`        | SDK minimum size | React Native view style                               |

Managed mode requires both `client` and `payment`. A merchant-controlled press-only mode remains available with `onPress` and no client.

## Errors

Failures reject with `VqWalletError`. Branch on `code`, never message text. The error also exposes `category`, `retryable`, `sdkRequestId`, and—when safely available—`orderNumber`.

Codes include configuration/request validation, platform availability, payment concurrency, Android lifecycle, user cancellation, developer/platform rejection, token encoding, and an unknown fallback. Native exception text, request JSON, payment data, gateway values, amounts, and token contents are never copied into the public error message.

## Operating caveats and troubleshooting

Use a real Android device or an emulator image with working Google Play
services and Google Wallet for meaningful Google Pay testing. The managed
button intentionally renders nothing when the wallet is not ready; capture
`onAvailabilityChange` to show your own non-payment fallback or explanation.

| Symptom or safe SDK code | Likely cause | Merchant action |
| --- | --- | --- |
| Button is absent; availability `unavailable` | Google Pay is not ready, or Google Play services are unavailable | Check `onAvailabilityChange`; use a supported Android device/profile and do not substitute a non-Google button for payment |
| `NATIVE_MODULE_UNAVAILABLE` | The app was refreshed in JavaScript only after package install, or native setup is incompatible | Rebuild and reinstall the Android app; do not manually register the package |
| `INVALID_CONFIGURATION` / `INVALID_PAYMENT_REQUEST` | Unknown keys, invalid merchant/gateway values, or malformed order/amount data | Validate against the configuration table; use a decimal string such as `'12.00'` |
| `DEVELOPER_ERROR` | Google rejected the request configuration | Confirm merchant/gateway onboarding values and that the Android build’s Google environment matches the intended Google profile |
| `GOOGLE_PAY_UNAVAILABLE` | Device/account/wallet cannot complete Google Pay now | Treat as an availability outcome; allow the shopper to choose another payment method |
| `PAYMENT_IN_PROGRESS` | A second payment attempt occurred before the first completed | Keep one checkout submission path; wait for success, failure, or cancellation |
| `NO_FOREGROUND_ACTIVITY` / `ACTIVITY_RECREATED` | The app was backgrounded, recreated, or changed activity during the payment sheet | Return to checkout and let the shopper initiate a new payment attempt |
| `USER_CANCELED` | Shopper dismissed the Google Pay sheet | Treat as cancellation, not a PSP decline; do not send a payment request to the backend |
| Backend rejects a valid-looking token | The backend changed the opaque token, used the wrong environment, or has its own PSP configuration issue | Send the exact `paymentToken` and `googlePayEnvironment`; diagnose only on the backend without mobile token logging |

## Redacted observability

Observability is silent by default. Optional adapters receive immutable availability and payment-lifecycle events containing only outcome classification, duration, SDK version, merchant transaction identity, SDK request identity, and stable error code where applicable.

Adapters never receive request JSON, response JSON, merchant/gateway configuration, amount, native exception text, or token contents. Exceptions thrown by an adapter are swallowed so merchant logging cannot change a payment outcome.

## Backend boundary

This SDK never sends the token to a VQ or merchant endpoint. The merchant application passes the returned token to its own backend/API client. That backend owns endpoint configuration, authentication, decryption, replay protection, idempotency, authorization, capture, settlement, retries, and secure server-side logging.

Keeping that boundary means API endpoints can change independently of the SDK. Prefer a stable merchant-owned mobile endpoint with downstream VQ/PSP destinations configured server-side.

## Verify from source

```shell
npm ci
npm run verify
npm run check:android-package
```

Android compilation requires a JDK compatible with the merchant application's Gradle and React Native stack; JDK 17 is the tested baseline. Physical-device, production signing/approval, and company sandbox processing evidence remain later release gates.

## 📄 License and releases

This project is licensed under the [MIT License](LICENSE). Release history and
package assets are published through the repository's [GitHub Releases](https://github.com/Veritas-Quaesitor/vq-digitalwallet-reactnative-google/releases) page.
