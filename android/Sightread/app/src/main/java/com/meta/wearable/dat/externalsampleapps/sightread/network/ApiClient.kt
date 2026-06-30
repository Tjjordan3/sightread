package com.meta.wearable.dat.externalsampleapps.sightread.network

import java.util.concurrent.TimeUnit
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

object ApiClient {
  private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

  val client: OkHttpClient =
      OkHttpClient.Builder()
          .connectTimeout(30, TimeUnit.SECONDS)
          .readTimeout(60, TimeUnit.SECONDS)
          .writeTimeout(60, TimeUnit.SECONDS)
          .build()

  fun postJson(url: String, body: String, headers: Map<String, String> = emptyMap()): HttpResult {
    val requestBuilder =
        Request.Builder()
            .url(url)
            .post(body.toRequestBody(jsonMediaType))
            .header("Content-Type", "application/json")
    headers.forEach { (key, value) -> requestBuilder.header(key, value) }
    client.newCall(requestBuilder.build()).execute().use { response ->
      val text = response.body?.string().orEmpty()
      return HttpResult(response.code, text)
    }
  }
}

data class HttpResult(val code: Int, val body: String) {
  val isSuccess: Boolean
    get() = code in 200..299
}
