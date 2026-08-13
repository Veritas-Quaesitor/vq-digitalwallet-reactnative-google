package com.veritasquaesitor.vqgooglepay

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class VqGooglePayPressEvent(surfaceId: Int, viewId: Int) :
  Event<VqGooglePayPressEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap = Arguments.createMap()

  companion object {
    const val EVENT_NAME = "topGooglePayPress"
  }
}
