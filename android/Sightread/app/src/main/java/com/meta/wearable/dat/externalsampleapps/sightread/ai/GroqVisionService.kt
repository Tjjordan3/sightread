package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class GroqVisionService(private val apiKey: String) : VisionAIService {
  override suspend fun analyze(jpegData: ByteArray, prompt: String): String =
      withContext(Dispatchers.IO) {
        require(apiKey.isNotBlank()) { "Add a Groq API key in Settings." }
        val base64 = Base64.encodeToString(jpegData, Base64.NO_WRAP)
        val url = URL("https://api.groq.com/openai/v1/chat/completions")
        val content =
            JSONArray()
                .put(JSONObject().put("type", "text").put("text", prompt))
                .put(
                    JSONObject()
                        .put("type", "image_url")
                        .put(
                            "image_url",
                            JSONObject().put("url", "data:image/jpeg;base64,$base64"),
                        ),
                )
        val body =
            JSONObject()
                .put("model", "meta-llama/llama-4-scout-17b-16e-instruct")
                .put("max_tokens", 300)
                .put(
                    "messages",
                    JSONArray().put(JSONObject().put("role", "user").put("content", content)),
                )
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
            (if (code in 200..299) conn.inputStream else conn.errorStream)
                .bufferedReader()
                .readText()
        if (code !in 200..299) error("API error $code: $text")
        JSONObject(text)
            .getJSONArray("choices")
            .getJSONObject(0)
            .getJSONObject("message")
            .getString("content")
            .trim()
      }
}
