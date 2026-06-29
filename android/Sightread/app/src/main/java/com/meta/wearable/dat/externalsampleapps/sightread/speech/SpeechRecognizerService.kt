package com.meta.wearable.dat.externalsampleapps.sightread.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import java.util.Locale

class SpeechRecognizerService(context: Context) {
  private val appContext = context.applicationContext
  private var recognizer: SpeechRecognizer? = null

  fun isAvailable(): Boolean = SpeechRecognizer.isRecognitionAvailable(appContext)

  fun startListening(onResult: (String) -> Unit, onError: (String) -> Unit) {
    if (!isAvailable()) {
      onError("Speech recognition not available on this device.")
      return
    }
    recognizer?.destroy()
    recognizer = SpeechRecognizer.createSpeechRecognizer(appContext)
    val intent =
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
          putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
          putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US)
          putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        }
    recognizer?.setRecognitionListener(
        object : RecognitionListener {
          override fun onReadyForSpeech(params: Bundle?) = Unit
          override fun onBeginningOfSpeech() = Unit
          override fun onRmsChanged(rmsdB: Float) = Unit
          override fun onBufferReceived(buffer: ByteArray?) = Unit
          override fun onEndOfSpeech() = Unit
          override fun onError(error: Int) {
            onError("Speech recognition error ($error)")
          }

          override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull()?.trim().orEmpty()
            if (text.isNotEmpty()) onResult(text)
          }

          override fun onPartialResults(partialResults: Bundle?) = Unit
          override fun onEvent(eventType: Int, params: Bundle?) = Unit
        },
    )
    recognizer?.startListening(intent)
  }

  fun stop() {
    recognizer?.stopListening()
  }

  fun destroy() {
    recognizer?.destroy()
    recognizer = null
  }
}
