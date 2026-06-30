package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

enum class AIProvider(val displayName: String) {
  GEMINI("Google Gemini"),
  OPENAI("OpenAI"),
  GROQ("Groq"),
  ANTHROPIC("Anthropic Claude"),
  MISTRAL("Mistral"),
  OPENROUTER("OpenRouter"),
  NVIDIA("NVIDIA NIM"),
}

enum class ThemeSetting {
  LIGHT,
  DARK,
  AUTO,
}

class SettingsRepository(context: Context) {
  private val prefs: SharedPreferences =
      context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  private val secure = SecureSettingsStore(context)

  var provider: AIProvider
    get() = parseProvider(prefs.getString(KEY_PROVIDER, AIProvider.GEMINI.name))
    set(value) = prefs.edit { putString(KEY_PROVIDER, value.name) }

  var theme: ThemeSetting
    get() = parseTheme(prefs.getString(KEY_THEME, ThemeSetting.AUTO.name))
    set(value) = prefs.edit { putString(KEY_THEME, value.name) }

  var openrouterModel: String
    get() = prefs.getString(KEY_OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL) ?: DEFAULT_OPENROUTER_MODEL
    set(value) = prefs.edit { putString(KEY_OPENROUTER_MODEL, value) }

  var nvidiaModel: String
    get() = prefs.getString(KEY_NVIDIA_MODEL, DEFAULT_NVIDIA_MODEL) ?: DEFAULT_NVIDIA_MODEL
    set(value) = prefs.edit { putString(KEY_NVIDIA_MODEL, value) }

  var selectedPromptId: String
    get() = prefs.getString(KEY_PROMPT, PromptPresets.all.first().id)!!
    set(value) = prefs.edit { putString(KEY_PROMPT, value) }

  var promptMode: PromptMode
    get() =
        if (prefs.getBoolean(KEY_PROMPT_MODE_MANUAL, false)) PromptMode.MANUAL else PromptMode.AUTO
    set(value) = prefs.edit { putBoolean(KEY_PROMPT_MODE_MANUAL, value == PromptMode.MANUAL) }

  var analysisIntervalSec: Int
    get() = prefs.getInt(KEY_INTERVAL, DEFAULT_INTERVAL).coerceIn(MIN_INTERVAL, MAX_INTERVAL)
    set(value) = prefs.edit { putInt(KEY_INTERVAL, value.coerceIn(MIN_INTERVAL, MAX_INTERVAL)) }

  var visionManualOnly: Boolean
    get() = prefs.getBoolean(KEY_VISION_MANUAL_ONLY, false)
    set(value) = prefs.edit { putBoolean(KEY_VISION_MANUAL_ONLY, value) }

  var isAIEnabled: Boolean
    get() = prefs.getBoolean(KEY_AI_ENABLED, true)
    set(value) = prefs.edit { putBoolean(KEY_AI_ENABLED, value) }

  var isTTSEnabled: Boolean
    get() = prefs.getBoolean(KEY_TTS_ENABLED, false)
    set(value) = prefs.edit { putBoolean(KEY_TTS_ENABLED, value) }

  var speakChatReplies: Boolean
    get() = prefs.getBoolean(KEY_SPEAK_CHAT_REPLIES, false)
    set(value) = prefs.edit { putBoolean(KEY_SPEAK_CHAT_REPLIES, value) }

  var webSearchEnabled: Boolean
    get() = prefs.getBoolean(KEY_WEB_SEARCH_ENABLED, false)
    set(value) = prefs.edit { putBoolean(KEY_WEB_SEARCH_ENABLED, value) }

  var searchProxyUrl: String
    get() = prefs.getString(KEY_SEARCH_PROXY_URL, "") ?: ""
    set(value) = prefs.edit { putString(KEY_SEARCH_PROXY_URL, value) }

  var onboardingComplete: Boolean
    get() = prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)
    set(value) = prefs.edit { putBoolean(KEY_ONBOARDING_COMPLETE, value) }

  var geminiApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_GEMINI)
    set(value) = secure.setString(SecureSettingsStore.KEY_GEMINI, value)

  var openAIApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_OPENAI)
    set(value) = secure.setString(SecureSettingsStore.KEY_OPENAI, value)

  var groqApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_GROQ)
    set(value) = secure.setString(SecureSettingsStore.KEY_GROQ, value)

  var anthropicApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_ANTHROPIC)
    set(value) = secure.setString(SecureSettingsStore.KEY_ANTHROPIC, value)

  var mistralApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_MISTRAL)
    set(value) = secure.setString(SecureSettingsStore.KEY_MISTRAL, value)

  var openrouterApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_OPENROUTER)
    set(value) = secure.setString(SecureSettingsStore.KEY_OPENROUTER, value)

  var nvidiaApiKey: String
    get() = secure.getString(SecureSettingsStore.KEY_NVIDIA)
    set(value) = secure.setString(SecureSettingsStore.KEY_NVIDIA, value)

  val selectedPrompt: PromptPreset
    get() = PromptPresets.preset(selectedPromptId)

  val visionPrompt: ResolvedVisionPrompt
    get() = PromptPresets.resolve(promptMode, selectedPromptId)

  fun apiKeyFor(provider: AIProvider): String =
      when (provider) {
        AIProvider.GEMINI -> geminiApiKey
        AIProvider.OPENAI -> openAIApiKey
        AIProvider.GROQ -> groqApiKey
        AIProvider.ANTHROPIC -> anthropicApiKey
        AIProvider.MISTRAL -> mistralApiKey
        AIProvider.OPENROUTER -> openrouterApiKey
        AIProvider.NVIDIA -> nvidiaApiKey
      }

  fun hasApiKeyForCurrentProvider(): Boolean = hasApiKeyFor(provider)

  fun hasApiKeyFor(provider: AIProvider): Boolean = apiKeyFor(provider).isNotBlank()

  companion object {
    private const val PREFS_NAME = "sightread_settings"
    private const val KEY_PROVIDER = "provider"
    private const val KEY_THEME = "theme"
    private const val KEY_OPENROUTER_MODEL = "openrouter_model"
    private const val KEY_NVIDIA_MODEL = "nvidia_model"
    private const val KEY_PROMPT = "prompt"
    private const val KEY_PROMPT_MODE_MANUAL = "prompt_mode_manual"
    private const val KEY_INTERVAL = "interval"
    private const val KEY_VISION_MANUAL_ONLY = "vision_manual_only"
    private const val KEY_AI_ENABLED = "ai_enabled"
    private const val KEY_TTS_ENABLED = "tts_enabled"
    private const val KEY_SPEAK_CHAT_REPLIES = "speak_chat_replies"
    private const val KEY_WEB_SEARCH_ENABLED = "web_search_enabled"
    private const val KEY_SEARCH_PROXY_URL = "search_proxy_url"
    private const val KEY_ONBOARDING_COMPLETE = "onboarding_complete"

    const val DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001"
    const val DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct"
    const val MIN_INTERVAL = 5
    const val MAX_INTERVAL = 30
    private const val DEFAULT_INTERVAL = 10

    private val VALID_PROVIDERS = AIProvider.entries.map { it.name }.toSet()

    private fun parseProvider(raw: String?): AIProvider {
      val name = raw?.uppercase() ?: return AIProvider.GEMINI
      return if (name in VALID_PROVIDERS) AIProvider.valueOf(name) else AIProvider.GEMINI
    }

    private fun parseTheme(raw: String?): ThemeSetting {
      return when (raw?.lowercase()) {
        "light" -> ThemeSetting.LIGHT
        "dark" -> ThemeSetting.DARK
        else -> ThemeSetting.AUTO
      }
    }
  }
}
