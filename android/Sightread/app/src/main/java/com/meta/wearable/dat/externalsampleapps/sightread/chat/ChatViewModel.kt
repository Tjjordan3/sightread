package com.meta.wearable.dat.externalsampleapps.sightread.chat

import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIProvider
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ImageEncoding
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class ChatUiState(
    val messages: List<ChatMessage> =
        listOf(ChatMessage(ChatRole.ASSISTANT, "Ask me anything, or attach what you're seeing.")),
    val draft: String = "",
    val attachFrame: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
)

class ChatViewModel(private val settings: SettingsRepository) : ViewModel() {
  private val _uiState = MutableStateFlow(ChatUiState())
  val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

  fun setDraft(value: String) = _uiState.update { it.copy(draft = value) }
  fun setAttachFrame(value: Boolean) = _uiState.update { it.copy(attachFrame = value) }

  fun send(currentFrame: Bitmap?) {
    val draft = _uiState.value.draft.trim()
    if (draft.isEmpty()) return

    if (!settings.hasApiKeyForCurrentProvider()) {
      _uiState.update { it.copy(error = "Add API key in Settings.") }
      return
    }

    val image =
        if (_uiState.value.attachFrame) {
          currentFrame
        } else {
          null
        }

    val attachedBytes = image?.let { ImageEncoding.jpegBytes(it)?.size }

    val nextMessages = _uiState.value.messages + ChatMessage(ChatRole.USER, draft, attachedImageBytes = attachedBytes)
    _uiState.update { it.copy(messages = nextMessages, draft = "", isSending = true, error = null) }

    viewModelScope.launch {
      try {
        val reply = requestReply(nextMessages, image)
        _uiState.update { it.copy(messages = it.messages + ChatMessage(ChatRole.ASSISTANT, reply), isSending = false) }
      } catch (e: Exception) {
        _uiState.update { it.copy(error = e.message ?: "Chat failed", isSending = false) }
      }
    }
  }

  private suspend fun requestReply(messages: List<ChatMessage>, attachedImage: Bitmap?): String =
      withContext(Dispatchers.IO) {
        val transcript =
            messages
                .takeLast(20)
                .joinToString("\n") { msg ->
                  val prefix = if (msg.role == ChatRole.USER) "User" else "Assistant"
                  "$prefix: ${msg.text}"
                }

        when (settings.provider) {
          AIProvider.GEMINI -> geminiChat(transcript, attachedImage)
          AIProvider.OPENAI -> openAIChat(transcript, attachedImage)
          AIProvider.GROQ -> groqChat(transcript, attachedImage)
        }
      }

  private fun geminiChat(transcript: String, attachedImage: Bitmap?): String {
    val apiKey = settings.geminiApiKey
    require(apiKey.isNotBlank()) { "Add a Gemini API key in Settings." }
    val url =
        URL(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey"
        )

    val parts = JSONArray().put(JSONObject().put("text", transcript))
    if (attachedImage != null) {
      val jpeg = ImageEncoding.jpegBytes(attachedImage, maxWidth = 512, quality = 60) ?: error("Failed to encode image")
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      parts.put(
          JSONObject()
              .put("inline_data", JSONObject().put("mime_type", "image/jpeg").put("data", base64)),
      )
    }

    val body = JSONObject().put("contents", JSONArray().put(JSONObject().put("parts", parts)))
    val conn =
        (url.openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          doOutput = true
          outputStream.use { it.write(body.toString().toByteArray()) }
        }

    val code = conn.responseCode
    val text =
        (if (code in 200..299) conn.inputStream else conn.errorStream).bufferedReader().readText()
    if (code !in 200..299) error("API error $code: $text")

    val json = JSONObject(text)
    val respParts =
        json.getJSONArray("candidates").getJSONObject(0).getJSONObject("content").getJSONArray("parts")
    return buildString {
          for (i in 0 until respParts.length()) append(respParts.getJSONObject(i).optString("text", ""))
        }
        .trim()
  }

  private fun openAIChat(transcript: String, attachedImage: Bitmap?): String {
    val apiKey = settings.openAIApiKey
    require(apiKey.isNotBlank()) { "Add an OpenAI API key in Settings." }
    val url = URL("https://api.openai.com/v1/chat/completions")

    val content =
        JSONArray()
            .put(JSONObject().put("type", "text").put("text", transcript))

    if (attachedImage != null) {
      val jpeg = ImageEncoding.jpegBytes(attachedImage, maxWidth = 512, quality = 60) ?: error("Failed to encode image")
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$base64").put("detail", "low")),
      )
    }

    val body =
        JSONObject()
            .put("model", "gpt-4o-mini")
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))

    val conn =
        (url.openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          setRequestProperty("Authorization", "Bearer $apiKey")
          doOutput = true
          outputStream.use { it.write(body.toString().toByteArray()) }
        }

    val code = conn.responseCode
    val text =
        (if (code in 200..299) conn.inputStream else conn.errorStream).bufferedReader().readText()
    if (code !in 200..299) error("API error $code: $text")

    return JSONObject(text)
        .getJSONArray("choices")
        .getJSONObject(0)
        .getJSONObject("message")
        .getString("content")
        .trim()
  }

  private fun groqChat(transcript: String, attachedImage: Bitmap?): String {
    val apiKey = settings.groqApiKey
    require(apiKey.isNotBlank()) { "Add a Groq API key in Settings." }
    val url = URL("https://api.groq.com/openai/v1/chat/completions")

    val content =
        JSONArray()
            .put(JSONObject().put("type", "text").put("text", transcript))

    if (attachedImage != null) {
      val jpeg = ImageEncoding.jpegBytes(attachedImage, maxWidth = 512, quality = 60) ?: error("Failed to encode image")
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$base64")),
      )
    }

    val body =
        JSONObject()
            .put("model", "meta-llama/llama-4-scout-17b-16e-instruct")
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))

    val conn =
        (url.openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          setRequestProperty("Authorization", "Bearer $apiKey")
          doOutput = true
          outputStream.use { it.write(body.toString().toByteArray()) }
        }

    val code = conn.responseCode
    val text =
        (if (code in 200..299) conn.inputStream else conn.errorStream).bufferedReader().readText()
    if (code !in 200..299) error("API error $code: $text")

    return JSONObject(text)
        .getJSONArray("choices")
        .getJSONObject(0)
        .getJSONObject("message")
        .getString("content")
        .trim()
  }
}

