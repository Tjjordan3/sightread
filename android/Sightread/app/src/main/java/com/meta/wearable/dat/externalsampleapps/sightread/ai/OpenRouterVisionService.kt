package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import com.meta.wearable.dat.externalsampleapps.sightread.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class OpenRouterVisionService(
    private val apiKey: String,
    private val model: String,
) : VisionAIService {
  override suspend fun analyze(jpegData: ByteArray, prompt: String): String =
      withContext(Dispatchers.IO) {
        require(apiKey.isNotBlank()) { "Add an OpenRouter API key in Settings." }
        val base64 = Base64.encodeToString(jpegData, Base64.NO_WRAP)
        val body =
            JSONObject()
                .put("model", model)
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
                                        .put(JSONObject().put("type", "text").put("text", prompt))
                                        .put(
                                            JSONObject()
                                                .put("type", "image_url")
                                                .put(
                                                    "image_url",
                                                    JSONObject()
                                                        .put("url", "data:image/jpeg;base64,$base64"),
                                                ),
                                        ),
                                ),
                        ),
                )
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
        OpenAICompatParser.parseContent(result.body)
      }
}
