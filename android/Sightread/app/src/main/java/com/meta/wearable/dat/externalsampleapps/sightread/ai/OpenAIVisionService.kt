package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import com.meta.wearable.dat.externalsampleapps.sightread.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class OpenAIVisionService(private val apiKey: String) : VisionAIService {
  override suspend fun analyze(jpegData: ByteArray, prompt: String): String =
      withContext(Dispatchers.IO) {
        require(apiKey.isNotBlank()) { "Add an OpenAI API key in Settings." }
        val base64 = Base64.encodeToString(jpegData, Base64.NO_WRAP)
        val content =
            JSONArray()
                .put(JSONObject().put("type", "text").put("text", prompt))
                .put(
                    JSONObject()
                        .put("type", "image_url")
                        .put(
                            "image_url",
                            JSONObject()
                                .put("url", "data:image/jpeg;base64,$base64")
                                .put("detail", "low"),
                        ),
                )
        val body =
            JSONObject()
                .put("model", "gpt-4o-mini")
                .put("max_tokens", 300)
                .put(
                    "messages",
                    JSONArray().put(JSONObject().put("role", "user").put("content", content)),
                )
                .toString()
        val result =
            ApiClient.postJson(
                "https://api.openai.com/v1/chat/completions",
                body,
                mapOf("Authorization" to "Bearer $apiKey"),
            )
        if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
        JSONObject(result.body)
            .getJSONArray("choices")
            .getJSONObject(0)
            .getJSONObject("message")
            .getString("content")
            .trim()
      }
}
