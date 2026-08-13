package com.veritasquaesitor.vqgooglepay

import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import com.google.android.gms.tasks.Task
import com.google.android.gms.wallet.PaymentData
import com.google.android.gms.wallet.contract.ApiTaskResult
import com.google.android.gms.wallet.contract.TaskResultContracts.GetPaymentDataResult

internal class PaymentDataActivityResultCoordinator {
  private var activity: ComponentActivity? = null
  private var launcher: ActivityResultLauncher<Task<PaymentData>>? = null
  private var onResult: ((ApiTaskResult<PaymentData>) -> Unit)? = null
  private var onFailure: ((String) -> Unit)? = null

  fun attach(activity: ComponentActivity) {
    if (this.activity === activity && launcher != null) {
      return
    }

    detach(ERROR_ACTIVITY_RECREATED)
    this.activity = activity
    launcher = activity.activityResultRegistry.register(REGISTRY_KEY, GetPaymentDataResult()) { result ->
      val resultCallback = onResult
      clearPending()
      resultCallback?.invoke(result)
    }
  }

  fun launch(
    task: Task<PaymentData>,
    resultCallback: (ApiTaskResult<PaymentData>) -> Unit,
    failureCallback: (String) -> Unit
  ): Boolean {
    val currentActivity = activity ?: return false
    val currentLauncher = launcher ?: return false
    if (hasPendingPayment()) {
      failureCallback(ERROR_PAYMENT_IN_PROGRESS)
      return true
    }

    onResult = resultCallback
    onFailure = failureCallback
    task.addOnCompleteListener(currentActivity) { completedTask ->
      if (onResult == null) {
        return@addOnCompleteListener
      }
      runCatching { currentLauncher.launch(completedTask) }
        .onFailure { failPending(ERROR_PLATFORM) }
    }
    return true
  }

  fun detach(errorCode: String = ERROR_ACTIVITY_RECREATED) {
    failPending(errorCode)
    launcher?.unregister()
    launcher = null
    activity = null
  }

  fun isAttached(): Boolean = launcher != null

  fun hasPendingPayment(): Boolean = onResult != null

  private fun failPending(errorCode: String) {
    val failureCallback = onFailure
    clearPending()
    failureCallback?.invoke(errorCode)
  }

  private fun clearPending() {
    onResult = null
    onFailure = null
  }

  companion object {
    const val ERROR_ACTIVITY_RECREATED = "ACTIVITY_RECREATED"
    const val ERROR_PAYMENT_IN_PROGRESS = "PAYMENT_IN_PROGRESS"
    const val ERROR_PLATFORM = "PLATFORM_ERROR"
    const val ERROR_MODULE_INVALIDATED = "NATIVE_MODULE_UNAVAILABLE"
    private const val REGISTRY_KEY = "vq-google-pay-payment-data"
  }
}
