package com.veritasquaesitor.vqgooglepay

import android.util.Base64
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.wallet.IsReadyToPayRequest
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.PaymentDataRequest
import com.google.android.gms.wallet.PaymentsClient
import com.google.android.gms.wallet.Wallet
import com.google.android.gms.wallet.WalletConstants
import com.google.android.gms.wallet.contract.ApiTaskResult
import java.nio.charset.StandardCharsets
import org.json.JSONObject

internal class VqGooglePayModule(
  private val reactContext: ReactApplicationContext
) : NativeVqGooglePaySpec(reactContext), LifecycleEventListener {
  private val activityResults = PaymentDataActivityResultCoordinator()
  private val walletOptions = Wallet.WalletOptions.Builder()
    .setEnvironment(environmentConstant())
    .build()

  override fun initialize() {
    super.initialize()
    reactContext.addLifecycleEventListener(this)
    attachToCurrentActivity()
  }

  override fun invalidate() {
    activityResults.detach(PaymentDataActivityResultCoordinator.ERROR_MODULE_INVALIDATED)
    reactContext.removeLifecycleEventListener(this)
    super.invalidate()
  }

  override fun getFoundationStatus(): String =
    if (activityResults.isAttached()) "activity-result-attached" else "awaiting-activity"

  override fun getGooglePayEnvironment(): String = BuildConfig.GOOGLE_PAY_ENVIRONMENT

  override fun checkAvailability(requestJson: String, promise: Promise) {
    if (!hasGooglePlayServices()) {
      reject(promise, ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE)
      return
    }

    val request = runCatching { IsReadyToPayRequest.fromJson(requestJson) }.getOrNull()
    if (request == null) {
      reject(promise, ERROR_DEVELOPER)
      return
    }

    paymentsClient().isReadyToPay(request)
      .addOnSuccessListener(promise::resolve)
      .addOnFailureListener { reject(promise, ERROR_PLATFORM) }
  }

  override fun requestPayment(requestJson: String, promise: Promise) {
    if (activityResults.hasPendingPayment()) {
      reject(promise, PaymentDataActivityResultCoordinator.ERROR_PAYMENT_IN_PROGRESS)
      return
    }
    if (!hasGooglePlayServices()) {
      reject(promise, ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE)
      return
    }

    val activity = reactContext.currentActivity as? ComponentActivity
    if (activity == null) {
      reject(promise, ERROR_NO_FOREGROUND_ACTIVITY)
      return
    }
    activityResults.attach(activity)

    val request = runCatching { PaymentDataRequest.fromJson(requestJson) }.getOrNull()
    if (request == null) {
      reject(promise, ERROR_DEVELOPER)
      return
    }

    val launched = activityResults.launch(
      Wallet.getPaymentsClient(activity, walletOptions).loadPaymentData(request),
      { result -> completePayment(result, promise) },
      { errorCode -> reject(promise, errorCode) }
    )
    if (!launched) {
      reject(promise, ERROR_NO_FOREGROUND_ACTIVITY)
    }
  }

  override fun encodePaymentToken(jsonString: String): String =
    Base64.encodeToString(
      jsonString.toByteArray(StandardCharsets.UTF_8),
      Base64.NO_WRAP
    )

  override fun onHostResume() {
    attachToCurrentActivity()
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    activityResults.detach(PaymentDataActivityResultCoordinator.ERROR_ACTIVITY_RECREATED)
  }

  private fun completePayment(result: ApiTaskResult<PaymentData>, promise: Promise) {
    val paymentData = result.result
    if (result.status.isSuccess && paymentData != null) {
      val rawToken = runCatching {
        JSONObject(paymentData.toJson())
          .getJSONObject("paymentMethodData")
          .getJSONObject("tokenizationData")
          .getString("token")
      }.getOrNull()
      if (rawToken == null) {
        reject(promise, ERROR_PLATFORM)
      } else {
        promise.resolve(rawToken)
      }
      return
    }

    when (result.status.statusCode) {
      CommonStatusCodes.CANCELED,
      WalletConstants.ERROR_CODE_USER_CANCELLED -> reject(promise, ERROR_USER_CANCELED)
      CommonStatusCodes.DEVELOPER_ERROR,
      WalletConstants.ERROR_CODE_INVALID_PARAMETERS -> reject(promise, ERROR_DEVELOPER)
      else -> reject(promise, ERROR_PLATFORM)
    }
  }

  private fun paymentsClient(): PaymentsClient = Wallet.getPaymentsClient(reactContext, walletOptions)

  private fun hasGooglePlayServices(): Boolean =
    GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(reactContext) ==
      ConnectionResult.SUCCESS

  private fun attachToCurrentActivity() {
    (reactContext.currentActivity as? ComponentActivity)?.let(activityResults::attach)
  }

  private fun environmentConstant(): Int =
    when (BuildConfig.GOOGLE_PAY_ENVIRONMENT) {
      "PRODUCTION" -> WalletConstants.ENVIRONMENT_PRODUCTION
      else -> WalletConstants.ENVIRONMENT_TEST
    }

  private fun reject(promise: Promise, code: String) {
    promise.reject(code, SAFE_ERROR_MESSAGES[code] ?: SAFE_ERROR_MESSAGES.getValue(ERROR_PLATFORM))
  }

  companion object {
    const val NAME = NativeVqGooglePaySpec.NAME
    private const val ERROR_DEVELOPER = "DEVELOPER_ERROR"
    private const val ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE = "GOOGLE_PLAY_SERVICES_UNAVAILABLE"
    private const val ERROR_NO_FOREGROUND_ACTIVITY = "NO_FOREGROUND_ACTIVITY"
    private const val ERROR_PLATFORM = "PLATFORM_ERROR"
    private const val ERROR_USER_CANCELED = "USER_CANCELED"
    private val SAFE_ERROR_MESSAGES = mapOf(
      PaymentDataActivityResultCoordinator.ERROR_ACTIVITY_RECREATED to
        "The Android activity changed during payment.",
      PaymentDataActivityResultCoordinator.ERROR_MODULE_INVALIDATED to
        "The Google Pay native module is unavailable.",
      PaymentDataActivityResultCoordinator.ERROR_PAYMENT_IN_PROGRESS to
        "A Google Pay payment is already in progress.",
      ERROR_DEVELOPER to "The Google Pay request configuration was rejected.",
      ERROR_GOOGLE_PLAY_SERVICES_UNAVAILABLE to "Google Play services are unavailable.",
      ERROR_NO_FOREGROUND_ACTIVITY to "A foreground Android activity is required.",
      ERROR_PLATFORM to "Google Pay could not complete the request.",
      ERROR_USER_CANCELED to "The user canceled Google Pay."
    )
  }
}
