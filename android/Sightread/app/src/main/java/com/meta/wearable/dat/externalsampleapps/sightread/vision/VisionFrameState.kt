package com.meta.wearable.dat.externalsampleapps.sightread.vision

import android.graphics.Bitmap
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Shared latest vision frame (phone camera or glasses stream) for Agent attach. */
class VisionFrameState {
  private val _currentFrame = MutableStateFlow<Bitmap?>(null)
  val currentFrame: StateFlow<Bitmap?> = _currentFrame.asStateFlow()

  fun update(bitmap: Bitmap?) {
    _currentFrame.value = bitmap
  }

  fun clear() {
    _currentFrame.value = null
  }
}

enum class VisionSource {
  PHONE,
  GLASSES,
}
