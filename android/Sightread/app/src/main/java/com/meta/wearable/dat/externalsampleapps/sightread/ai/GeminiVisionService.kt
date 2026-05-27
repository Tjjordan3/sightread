package com.meta.wearable.dat.externalsampleapps.sightread.ai

import android.util.Base64
import java.net.HttpURLConnection
import java.net.URL
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
            URL(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$apiKey"
            )
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
        val conn = (url.openConnection() as HttpURLConnection).apply {
          requestMethod = "POST"
          setRequestProperty("Content-Type", "application/json")
          doOutput = true
          outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val code = conn.responseCode
        val text =
            (if (code in 200..299) conn.inputStream else conn.errorStream)
                .bufferedReader()
                .readText()
        if (code !in 200..299) error("API error $code: $text")
        val json = JSONObject(text)
        val parts =
            json.getJSONArray("candidates")
                .getJSONObject(0)
                .getJSONObject("content")
                .getJSONArray("parts")
        buildString {
          for (i in 0 until parts.length()) {
            append(parts.getJSONObject(i).optString("text", ""))
          }
        }.trim()
      }
}
