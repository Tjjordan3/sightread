package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import com.meta.wearable.dat.externalsampleapps.sightread.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class AnthropicVisionService(private val apiKey: String) : VisionAIService {
  override suspend fun analyze(jpegData: ByteArray, prompt: String): String =
      withContext(Dispatchers.IO) {
        require(apiKey.isNotBlank()) { "Add an Anthropic API key in Settings." }
        val base64 = Base64.encodeToString(jpegData, Base64.NO_WRAP)
        val body =
            JSONObject()
                .put("model", "claude-3-5-haiku-latest")
                .put("max_tokens", 300)
                .put(
                    "messages",
                    JSONArray()
                        .put(
                            JSONObject()
                                .put("role", "user")
                                .put(
                                    "content",
                                    JSONArray()
                                        .put(
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
                                        .put(JSONObject().put("type", "text").put("text", prompt)),
                                ),
                        ),
                )
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
        parseAnthropicText(result.body)
      }

  internal companion object {
    fun parseAnthropicText(json: String): String {
      val content = JSONObject(json).getJSONArray("content")
      val text =
          buildString {
            for (i in 0 until content.length()) {
              val block = content.getJSONObject(i)
              if (block.optString("type") == "text") append(block.optString("text", ""))
            }
          }.trim()
      if (text.isEmpty()) error("Empty response from Anthropic.")
      return text
    }
  }
}
