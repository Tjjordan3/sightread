package com.meta.wearable.dat.externalsampleapps.sightread.chat

import android.graphics.Bitmap
import android.util.Base64
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AIProvider
import com.meta.wearable.dat.externalsampleapps.sightread.ai.AnthropicVisionService
import com.meta.wearable.dat.externalsampleapps.sightread.ai.ImageEncoding
import com.meta.wearable.dat.externalsampleapps.sightread.ai.OpenAICompatParser
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.network.ApiClient
import com.meta.wearable.dat.externalsampleapps.sightread.storage.MessageEntity
import org.json.JSONArray
import org.json.JSONObject

class ChatService(private val settings: SettingsRepository) {
  suspend fun requestReply(messages: List<MessageEntity>, attachedImage: Bitmap?): String {
    val transcript =
        messages
            .takeLast(20)
            .joinToString("\n") { msg ->
              val prefix = if (msg.role == "user") "User" else "Assistant"
              "$prefix: ${msg.text}"
            }
    val imageBytes =
        attachedImage?.let {
          ImageEncoding.jpegBytes(it, maxWidth = 512, quality = 60)
        }
    return when (settings.provider) {
      AIProvider.GEMINI -> geminiChat(transcript, imageBytes)
      AIProvider.OPENAI -> openAIChat(transcript, imageBytes)
      AIProvider.GROQ -> groqChat(transcript, imageBytes)
      AIProvider.ANTHROPIC -> anthropicChat(transcript, imageBytes)
      AIProvider.MISTRAL -> mistralChat(transcript, imageBytes)
      AIProvider.OPENROUTER -> openRouterChat(transcript, imageBytes)
      AIProvider.NVIDIA -> nvidiaChat(transcript, imageBytes)
    }
  }

  private fun geminiChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.geminiApiKey
    require(apiKey.isNotBlank()) { "Add a Gemini API key in Settings." }
    val url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${java.net.URLEncoder.encode(apiKey, "UTF-8")}"
    val parts = JSONArray().put(JSONObject().put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      parts.put(
          JSONObject()
              .put("inline_data", JSONObject().put("mime_type", "image/jpeg").put("data", base64)),
      )
    }
    val body = JSONObject().put("contents", JSONArray().put(JSONObject().put("parts", parts))).toString()
    val result = ApiClient.postJson(url, body)
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    val respParts =
        JSONObject(result.body)
            .getJSONArray("candidates")
            .getJSONObject(0)
            .getJSONObject("content")
            .getJSONArray("parts")
    return buildString {
      for (i in 0 until respParts.length()) append(respParts.getJSONObject(i).optString("text", ""))
    }.trim()
  }

  private fun openAIChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.openAIApiKey
    require(apiKey.isNotBlank()) { "Add an OpenAI API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put(
                  "image_url",
                  JSONObject().put("url", "data:image/jpeg;base64,$base64").put("detail", "low"),
              ),
      )
    }
    val body =
        JSONObject()
            .put("model", "gpt-4o-mini")
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
            .toString()
    val result =
        ApiClient.postJson(
            "https://api.openai.com/v1/chat/completions",
            body,
            mapOf("Authorization" to "Bearer $apiKey"),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return OpenAICompatParser.parseContent(result.body)
  }

  private fun groqChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.groqApiKey
    require(apiKey.isNotBlank()) { "Add a Groq API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
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
            .toString()
    val result =
        ApiClient.postJson(
            "https://api.groq.com/openai/v1/chat/completions",
            body,
            mapOf("Authorization" to "Bearer $apiKey"),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return OpenAICompatParser.parseContent(result.body)
  }

  private fun anthropicChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.anthropicApiKey
    require(apiKey.isNotBlank()) { "Add an Anthropic API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image")
              .put(
                  "source",
                  JSONObject()
                      .put("type", "base64")
                      .put("media_type", "image/jpeg")
                      .put("data", base64),
              ),
      )
    }
    val body =
        JSONObject()
            .put("model", "claude-3-5-haiku-latest")
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
            .toString()
    val result =
        ApiClient.postJson(
            "https://api.anthropic.com/v1/messages",
            body,
            mapOf(
                "x-api-key" to apiKey,
                "anthropic-version" to "2023-06-01",
            ),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return AnthropicVisionService.parseAnthropicText(result.body)
  }

  private fun mistralChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.mistralApiKey
    require(apiKey.isNotBlank()) { "Add a Mistral API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put("image_url", "data:image/jpeg;base64,$base64"),
      )
    }
    val body =
        JSONObject()
            .put("model", "pixtral-12b-2409")
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
            .toString()
    val result =
        ApiClient.postJson(
            "https://api.mistral.ai/v1/chat/completions",
            body,
            mapOf("Authorization" to "Bearer $apiKey"),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return OpenAICompatParser.parseContent(result.body)
  }

  private fun openRouterChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.openrouterApiKey
    require(apiKey.isNotBlank()) { "Add an OpenRouter API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$base64")),
      )
    }
    val body =
        JSONObject()
            .put("model", settings.openrouterModel)
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
            .toString()
    val result =
        ApiClient.postJson(
            "https://openrouter.ai/api/v1/chat/completions",
            body,
            mapOf(
                "Authorization" to "Bearer $apiKey",
                "HTTP-Referer" to "https://sightread.app",
                "X-Title" to "Sightread",
            ),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return OpenAICompatParser.parseContent(result.body)
  }

  private fun nvidiaChat(transcript: String, imageBytes: ByteArray?): String {
    val apiKey = settings.nvidiaApiKey
    require(apiKey.isNotBlank()) { "Add an NVIDIA API key in Settings." }
    val content = JSONArray().put(JSONObject().put("type", "text").put("text", transcript))
    imageBytes?.let { jpeg ->
      val base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP)
      content.put(
          JSONObject()
              .put("type", "image_url")
              .put("image_url", JSONObject().put("url", "data:image/jpeg;base64,$base64")),
      )
    }
    val body =
        JSONObject()
            .put("model", settings.nvidiaModel)
            .put("max_tokens", 400)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", content)))
            .toString()
    val result =
        ApiClient.postJson(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            body,
            mapOf("Authorization" to "Bearer $apiKey"),
        )
    if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
    return OpenAICompatParser.parseContent(result.body)
  }
}
