package com.meta.wearable.dat.externalsampleapps.sightread.speech

import android.content.Context
import android.speech.tts.TextToSpeech
import java.util.Locale

class SpeechService(context: Context) {
  private var tts: TextToSpeech? = null
  private var ready = false

  init {
    tts =
        TextToSpeech(context.applicationContext) { status ->
          ready = status == TextToSpeech.SUCCESS
          tts?.language = Locale.US
        }
  }

  fun speak(text: String) {
    if (!ready) return
    tts?.stop()
    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "sightread-tts")
  }

  fun stop() {
    tts?.stop()
  }

  fun shutdown() {
    tts?.shutdown()
    tts = null
  }
}
