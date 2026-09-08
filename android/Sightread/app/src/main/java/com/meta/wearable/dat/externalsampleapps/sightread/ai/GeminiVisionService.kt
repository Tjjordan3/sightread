package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import com.meta.wearable.dat.externalsampleapps.sightread.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class GeminiVisionService(private val apiKey: String) : VisionAIService {
  override suspend fun analyze(jpegData: ByteArray, prompt: String): String =
      withContext(Dispatchers.IO) {
        require(apiKey.isNotBlank()) { "Add a Gemini API key in Settings." }
        val base64 = Base64.encodeToString(jpegData, Base64.NO_WRAP)
        val url =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${java.net.URLEncoder.encode(apiKey, "UTF-8")}"
        val body =
            JSONObject()
                .put(
                    "contents",
                    JSONArray()
                        .put(
                            JSONObject()
                                .put(
                                    "parts",
                                    JSONArray()
                                        .put(JSONObject().put("text", prompt))
                                        .put(
                                            JSONObject()
                                                .put(
                                                    "inline_data",
                                                    JSONObject()
                                                        .put("mime_type", "image/jpeg")
                                                        .put("data", base64),
                                                ),
                                        ),
                                ),
                        ),
                )
                .toString()
        val result = ApiClient.postJson(url, body)
        if (!result.isSuccess) error("API error ${result.code}: ${result.body}")
        val parts =
            JSONObject(result.body)
                .getJSONArray("candidates")
                .getJSONObject(0)
                .getJSONObject("content")
                .getJSONArray("parts")
        buildString {
          for (i in 0 until parts.length()) append(parts.getJSONObject(i).optString("text", ""))
        }.trim()
      }
}
