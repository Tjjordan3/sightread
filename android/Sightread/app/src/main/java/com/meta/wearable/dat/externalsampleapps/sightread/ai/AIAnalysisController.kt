package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.graphics.Bitmap
import com.meta.wearable.dat.externalsampleapps.sightread.speech.SpeechService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

enum class AnalysisState {
  IDLE,
  RUNNING,
  ERROR,
}

data class AIResponseEntry(val text: String, val promptTitle: String, val timestampMs: Long)

data class AIUiState(
    val analysisState: AnalysisState = AnalysisState.IDLE,
    val latestResponse: String = "",
    val errorMessage: String = "",
    val responses: List<AIResponseEntry> = emptyList(),
)

class AIAnalysisController(
    private val scope: CoroutineScope,
    private val settings: SettingsRepository,
    private val speechService: SpeechService,
) {
  private val _uiState = MutableStateFlow(AIUiState())
  val uiState: StateFlow<AIUiState> = _uiState.asStateFlow()

  private var analysisJob: Job? = null
  private var lastSampleMs: Long = 0
  private val mutex = Mutex()
  private var isProcessing = false
  private var didShowMissingKeyError = false

  fun reset() {
    analysisJob?.cancel()
    lastSampleMs = 0
    isProcessing = false
    didShowMissingKeyError = false
    speechService.stop()
    _uiState.value = AIUiState()
  }

  fun processFrame(bitmap: Bitmap) {
    if (!settings.isAIEnabled) return
    if (!settings.hasApiKeyForCurrentProvider()) {
      if (!didShowMissingKeyError) {
        didShowMissingKeyError = true
        _uiState.update {
          it.copy(analysisState = AnalysisState.ERROR, errorMessage = "Add API key in Settings.")
        }
      }
      return
    }
    didShowMissingKeyError = false
    val now = System.currentTimeMillis()
    if (isProcessing || now - lastSampleMs < settings.analysisIntervalSec * 1000L) return
    lastSampleMs = now
    runAnalysis(bitmap, manual = false)
  }

  fun analyzeNow(bitmap: Bitmap) {
    analysisJob?.cancel()
    lastSampleMs = 0
    runAnalysis(bitmap, manual = true)
  }

  private fun runAnalysis(bitmap: Bitmap, manual: Boolean) {
    analysisJob =
        scope.launch {
          mutex.withLock {
            if (isProcessing) return@launch
            isProcessing = true
          }
          _uiState.update { it.copy(analysisState = AnalysisState.RUNNING, errorMessage = "") }
          try {
            val jpeg =
                ImageEncoding.jpegBytes(
                    bitmap,
                    maxWidth = if (manual) 768 else 512,
                    quality = if (manual) 75 else 60,
                ) ?: return@launch
            val service = VisionAIServiceFactory.create(settings.provider, settings)
            val visionPrompt = settings.visionPrompt
            val result = service.analyze(jpeg, visionPrompt.prompt)
            val title = visionPrompt.title + if (manual) " (now)" else ""
            _uiState.update {
              val entries =
                  listOf(AIResponseEntry(result, title, System.currentTimeMillis())) + it.responses
              it.copy(
                  analysisState = AnalysisState.IDLE,
                  latestResponse = result,
                  responses = entries.take(10),
              )
            }
            if (settings.isTTSEnabled) speechService.speak(result)
          } catch (e: Exception) {
            _uiState.update {
              it.copy(analysisState = AnalysisState.ERROR, errorMessage = e.message ?: "Analysis failed")
            }
          } finally {
            mutex.withLock { isProcessing = false }
          }
        }
  }
}
