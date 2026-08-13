package com.veritasquaesitor.vqgooglepay

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.VqGooglePayButtonManagerDelegate
import com.facebook.react.viewmanagers.VqGooglePayButtonManagerInterface

@ReactModule(name = VqGooglePayButtonManager.NAME)
internal class VqGooglePayButtonManager : SimpleViewManager<VqGooglePayButtonView>(),
  VqGooglePayButtonManagerInterface<VqGooglePayButtonView> {
  private val delegate: ViewManagerDelegate<VqGooglePayButtonView> =
    VqGooglePayButtonManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<VqGooglePayButtonView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): VqGooglePayButtonView =
    VqGooglePayButtonView(context)

  override fun setAllowedPaymentMethods(view: VqGooglePayButtonView, value: String?) {
    view.setAllowedPaymentMethods(value)
  }

  override fun setButtonTheme(view: VqGooglePayButtonView, value: String?) {
    view.setButtonTheme(value)
  }

  override fun setButtonType(view: VqGooglePayButtonView, value: String?) {
    view.setButtonType(value)
  }

  override fun setCornerRadius(view: VqGooglePayButtonView, value: Int) {
    view.setCornerRadius(value)
  }

  override fun onAfterUpdateTransaction(view: VqGooglePayButtonView) {
    super.onAfterUpdateTransaction(view)
    view.refreshButton()
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
      put(VqGooglePayPressEvent.EVENT_NAME, mapOf("registrationName" to "onGooglePayPress"))
    }

  companion object {
    const val NAME = "VqGooglePayButton"
  }
}
