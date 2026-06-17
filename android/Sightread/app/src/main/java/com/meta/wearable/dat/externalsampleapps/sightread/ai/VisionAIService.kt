package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.graphics.Bitmap
import java.io.ByteArrayOutputStream

interface VisionAIService {
  suspend fun analyze(jpegData: ByteArray, prompt: String): String
}

object VisionAIServiceFactory {
  fun create(provider: AIProvider, settings: SettingsRepository): VisionAIService =
      when (provider) {
        AIProvider.GEMINI -> GeminiVisionService(settings.geminiApiKey)
        AIProvider.OPENAI -> OpenAIVisionService(settings.openAIApiKey)
        AIProvider.GROQ -> GroqVisionService(settings.groqApiKey)
      }
}

object ImageEncoding {
  fun jpegBytes(bitmap: Bitmap, maxWidth: Int = 512, quality: Int = 60): ByteArray? {
    val scale = minOf(1f, maxWidth.toFloat() / bitmap.width)
    val w = (bitmap.width * scale).toInt().coerceAtLeast(1)
    val h = (bitmap.height * scale).toInt().coerceAtLeast(1)
    val scaled = Bitmap.createScaledBitmap(bitmap, w, h, true)
    return ByteArrayOutputStream().use { stream ->
      if (!scaled.compress(Bitmap.CompressFormat.JPEG, quality, stream)) return null
      stream.toByteArray()
    }
  }
}
