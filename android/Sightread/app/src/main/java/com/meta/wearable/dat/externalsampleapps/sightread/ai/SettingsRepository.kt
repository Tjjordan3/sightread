package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

enum class AIProvider { GEMINI, OPENAI }

class SettingsRepository(context: Context) {
  private val prefs: SharedPreferences =
      context.getSharedPreferences("sightread_settings", Context.MODE_PRIVATE)

  var provider: AIProvider
    get() = AIProvider.valueOf(prefs.getString(KEY_PROVIDER, AIProvider.GEMINI.name)!!)
    set(value) = prefs.edit { putString(KEY_PROVIDER, value.name) }

  var selectedPromptId: String
    get() = prefs.getString(KEY_PROMPT, PromptPresets.all.first().id)!!
    set(value) = prefs.edit { putString(KEY_PROMPT, value) }

  var analysisIntervalSec: Int
    get() = prefs.getInt(KEY_INTERVAL, 3).coerceIn(2, 10)
    set(value) = prefs.edit { putInt(KEY_INTERVAL, value.coerceIn(2, 10)) }

  var isAIEnabled: Boolean
    get() = prefs.getBoolean(KEY_AI_ENABLED, true)
    set(value) = prefs.edit { putBoolean(KEY_AI_ENABLED, value) }

  var isTTSEnabled: Boolean
    get() = prefs.getBoolean(KEY_TTS_ENABLED, false)
    set(value) = prefs.edit { putBoolean(KEY_TTS_ENABLED, value) }

  var geminiApiKey: String
    get() = prefs.getString(KEY_GEMINI, "") ?: ""
    set(value) = prefs.edit { putString(KEY_GEMINI, value) }

  var openAIApiKey: String
    get() = prefs.getString(KEY_OPENAI, "") ?: ""
    set(value) = prefs.edit { putString(KEY_OPENAI, value) }

  val selectedPrompt: PromptPreset
    get() = PromptPresets.preset(selectedPromptId)

  fun hasApiKeyForCurrentProvider(): Boolean =
      when (provider) {
        AIProvider.GEMINI -> geminiApiKey.isNotBlank()
        AIProvider.OPENAI -> openAIApiKey.isNotBlank()
      }

  companion object {
    private const val KEY_PROVIDER = "provider"
    private const val KEY_PROMPT = "prompt"
    private const val KEY_INTERVAL = "interval"
    private const val KEY_AI_ENABLED = "ai_enabled"
    private const val KEY_TTS_ENABLED = "tts_enabled"
    private const val KEY_GEMINI = "gemini_key"
    private const val KEY_OPENAI = "openai_key"
  }
}
