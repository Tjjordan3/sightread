package com.meta.wearable.dat.externalsampleapps.sightread.vision

import android.app.Application
import android.graphics.Bitmap
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIAnalysisController
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.speech.SpeechService
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class PhoneVisionUiState(
    val isActive: Boolean = false,
    val error: String? = null,
)

class PhoneVisionViewModel(
    application: Application,
    private val visionFrameState: VisionFrameState,
) : AndroidViewModel(application) {
  private val settings = SettingsRepository(application)
  private val speechService = SpeechService(application)
  val aiController = AIAnalysisController(viewModelScope, settings, speechService)

  private val _uiState = MutableStateFlow(PhoneVisionUiState())
  val uiState: StateFlow<PhoneVisionUiState> = _uiState.asStateFlow()

  private var cameraExecutor: ExecutorService? = null
  private var bound = false

  fun bindCamera(lifecycleOwner: LifecycleOwner, previewView: PreviewView) {
    if (bound) return
    val context = getApplication<Application>()
    val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
    cameraProviderFuture.addListener(
        {
          try {
            val cameraProvider = cameraProviderFuture.get()
            val preview =
                Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
            val analysis =
                ImageAnalysis.Builder()
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
            val executor = Executors.newSingleThreadExecutor()
            cameraExecutor = executor
            analysis.setAnalyzer(executor) { imageProxy ->
              processFrame(imageProxy)
              imageProxy.close()
            }
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                preview,
                analysis,
            )
            bound = true
            _uiState.update { it.copy(isActive = true, error = null) }
          } catch (e: Exception) {
            Log.e(TAG, "Camera bind failed", e)
            _uiState.update { it.copy(error = e.message ?: "Camera failed to start") }
          }
        },
        ContextCompat.getMainExecutor(context),
    )
  }

  fun analyzeNow() {
    visionFrameState.currentFrame.value?.let { aiController.analyzeNow(it) }
  }

  fun unbind() {
    if (!bound) return
    try {
      val context = getApplication<Application>()
      ProcessCameraProvider.getInstance(context).get().unbindAll()
    } catch (_: Exception) {
    }
    cameraExecutor?.shutdown()
    cameraExecutor = null
    bound = false
    aiController.reset()
    visionFrameState.clear()
    _uiState.update { PhoneVisionUiState() }
  }

  private fun processFrame(imageProxy: ImageProxy) {
    val bitmap = imageProxy.toRgbaBitmap() ?: return
    visionFrameState.update(bitmap)
    aiController.processFrame(bitmap)
  }

  private fun ImageProxy.toRgbaBitmap(): Bitmap? {
    if (planes.isEmpty()) return null
    val plane = planes[0]
    val buffer = plane.buffer
    buffer.rewind()
    return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply {
      copyPixelsFromBuffer(buffer)
    }
  }

  override fun onCleared() {
    unbind()
    speechService.shutdown()
    super.onCleared()
  }

  class Factory(
      private val application: Application,
      private val visionFrameState: VisionFrameState,
  ) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
      return PhoneVisionViewModel(application, visionFrameState) as T
    }
  }

  companion object {
    private const val TAG = "PhoneVisionViewModel"
  }
}
