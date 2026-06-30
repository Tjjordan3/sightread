package com.meta.wearable.dat.externalsampleapps.sightread.ai

import org.json.JSONObject

object OpenAICompatParser {
  fun parseContent(json: String): String {
    val text =
        JSONObject(json)
            .getJSONArray("choices")
            .getJSONObject(0)
            .getJSONObject("message")
            .getString("content")
            .trim()
    if (text.isEmpty()) error("Empty response from API.")
    return text
  }
}
