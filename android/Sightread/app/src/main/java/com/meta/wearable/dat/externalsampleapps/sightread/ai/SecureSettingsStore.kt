package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureSettingsStore(context: Context) {
  private val appContext = context.applicationContext
  private val legacyPrefs: SharedPreferences =
      appContext.getSharedPreferences(LEGACY_PREFS, Context.MODE_PRIVATE)

  private val securePrefs: SharedPreferences by lazy {
    val masterKey =
        MasterKey.Builder(appContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    EncryptedSharedPreferences.create(
        appContext,
        SECURE_PREFS,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
  }

  init {
    migrateLegacyKeysIfNeeded()
  }

  fun getString(key: String): String = securePrefs.getString(key, "") ?: ""

  fun setString(key: String, value: String) {
    securePrefs.edit {
      if (value.isEmpty()) remove(key) else putString(key, value)
    }
  }

  private fun migrateLegacyKeysIfNeeded() {
    if (legacyPrefs.getBoolean(MIGRATION_DONE, false)) return
    val keys =
        listOf(
            KEY_GEMINI,
            KEY_OPENAI,
            KEY_GROQ,
            KEY_ANTHROPIC,
            KEY_MISTRAL,
            KEY_OPENROUTER,
            KEY_NVIDIA,
        )
    securePrefs.edit {
      keys.forEach { key ->
        val legacy = legacyPrefs.getString(key, null)
        if (!legacy.isNullOrEmpty()) putString(key, legacy)
      }
    }
    legacyPrefs.edit {
      keys.forEach { remove(it) }
      putBoolean(MIGRATION_DONE, true)
    }
  }

  companion object {
    private const val LEGACY_PREFS = "sightread_settings"
    private const val SECURE_PREFS = "sightread_secure_keys"
    private const val MIGRATION_DONE = "secure_keys_migrated"

    const val KEY_GEMINI = "gemini_key"
    const val KEY_OPENAI = "openai_key"
    const val KEY_GROQ = "groq_key"
    const val KEY_ANTHROPIC = "anthropic_key"
    const val KEY_MISTRAL = "mistral_key"
    const val KEY_OPENROUTER = "openrouter_key"
    const val KEY_NVIDIA = "nvidia_key"
  }
}
