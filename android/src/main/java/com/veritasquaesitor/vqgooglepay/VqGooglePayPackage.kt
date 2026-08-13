package com.veritasquaesitor.vqgooglepay

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class VqGooglePayPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    if (name == VqGooglePayModule.NAME) VqGooglePayModule(reactContext) else null

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(VqGooglePayButtonManager())

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      VqGooglePayModule.NAME to ReactModuleInfo(
        name = VqGooglePayModule.NAME,
        className = VqGooglePayModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = true
      )
    )
  }
}
