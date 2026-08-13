package com.veritasquaesitor.vqgooglepay

import android.content.Context
import android.view.View
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.gms.wallet.button.ButtonConstants
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton

internal class VqGooglePayButtonView(context: Context) : FrameLayout(context) {
  private var allowedPaymentMethods = FOUNDATION_ALLOWED_PAYMENT_METHODS
  private var buttonTheme = ButtonConstants.ButtonTheme.DARK
  private var buttonType = ButtonConstants.ButtonType.PAY
  private var cornerRadiusDp = 100
  private val rebuildButtonRunnable = Runnable { rebuildButton() }
  private val layoutRunnable = Runnable {
    if (width == 0 || height == 0) {
      return@Runnable
    }

    measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
    )
    layout(left, top, right, bottom)
  }

  private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener {
    requestLayout()
  }
  private var isGlobalLayoutListenerRegistered = false

  init {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    registerGlobalLayoutListener()
  }

  fun refreshButton() {
    removeCallbacks(rebuildButtonRunnable)
    post(rebuildButtonRunnable)
  }

  private fun rebuildButton() {
    removeAllViews()
    val options = ButtonOptions.newBuilder()
      .setButtonTheme(buttonTheme)
      .setButtonType(buttonType)
      .setCornerRadius(cornerRadiusDp)
      .setAllowedPaymentMethods(allowedPaymentMethods)
      .build()
    val payButton = PayButton(context).apply {
      setOnClickListener {
        val reactContext = context as ReactContext
        UIManagerHelper.getEventDispatcher(reactContext)?.dispatchEvent(
          VqGooglePayPressEvent(
            UIManagerHelper.getSurfaceId(reactContext),
            this@VqGooglePayButtonView.id
          )
        )
      }
    }
    addView(
      payButton,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
    payButton.initialize(options)
  }

  fun setAllowedPaymentMethods(value: String?) {
    allowedPaymentMethods = value ?: FOUNDATION_ALLOWED_PAYMENT_METHODS
    refreshButton()
  }

  fun setButtonTheme(value: String?) {
    buttonTheme = when (value) {
      "light" -> ButtonConstants.ButtonTheme.LIGHT
      else -> ButtonConstants.ButtonTheme.DARK
    }
    refreshButton()
  }

  fun setButtonType(value: String?) {
    buttonType = when (value) {
      "buy" -> ButtonConstants.ButtonType.BUY
      "checkout" -> ButtonConstants.ButtonType.CHECKOUT
      "order" -> ButtonConstants.ButtonType.ORDER
      "plain" -> ButtonConstants.ButtonType.PLAIN
      else -> ButtonConstants.ButtonType.PAY
    }
    refreshButton()
  }

  fun setCornerRadius(value: Int) {
    cornerRadiusDp = value.coerceIn(0, MAX_CORNER_RADIUS_DP)
    refreshButton()
  }

  override fun requestLayout() {
    super.requestLayout()
    post(layoutRunnable)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    registerGlobalLayoutListener()
  }

  override fun onDetachedFromWindow() {
    removeCallbacks(layoutRunnable)
    removeCallbacks(rebuildButtonRunnable)
    if (isGlobalLayoutListenerRegistered) {
      viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
      isGlobalLayoutListenerRegistered = false
    }
    super.onDetachedFromWindow()
  }

  private fun registerGlobalLayoutListener() {
    if (!isGlobalLayoutListenerRegistered) {
      viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
      isGlobalLayoutListenerRegistered = true
    }
  }

  private companion object {
    const val FOUNDATION_ALLOWED_PAYMENT_METHODS =
      "[{\"type\":\"CARD\",\"parameters\":{\"allowedAuthMethods\":[\"PAN_ONLY\",\"CRYPTOGRAM_3DS\"],\"allowedCardNetworks\":[\"MASTERCARD\",\"VISA\"]}}]"
    const val MAX_CORNER_RADIUS_DP = 100
  }
}
