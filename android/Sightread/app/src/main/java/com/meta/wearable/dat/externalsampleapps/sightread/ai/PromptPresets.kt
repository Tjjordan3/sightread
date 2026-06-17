package com.meta.wearable.dat.externalsampleapps.sightread.ai

enum class PromptMode {
  AUTO,
  MANUAL,
}

data class PromptPreset(val id: String, val title: String, val prompt: String)

data class ResolvedVisionPrompt(
    val id: String,
    val title: String,
    val prompt: String,
    val inferred: Boolean,
)

object PromptPresets {
  const val AUTO_PROMPT_ID = "auto"

  const val AUTO_VISION_PROMPT =
      "You are helping a visually impaired user understand their surroundings. In a few short, spoken-friendly sentences: describe the scene, read any important visible text, note hazards or obstacles, and mention anything useful for getting around. Be concise and practical."

  val all =
      listOf(
          PromptPreset("scene", "Describe scene", "Describe what I am looking at in 2 sentences. Be specific about objects and any visible text."),
          PromptPreset("navigation", "Navigation", "Identify street signs, storefront names, and suggest which direction I should turn if relevant."),
          PromptPreset("accessibility", "Read text", "Read any visible text in a clear, spoken-friendly way: menus, labels, and signs."),
          PromptPreset("safety", "Safety check", "Flag hazards in my field of view: obstacles, curbs, vehicles, or uneven ground."),
          PromptPreset("shopping", "Shopping", "Identify products on shelves and any visible price tags you can read."),
          PromptPreset("social", "Scene context", "How many people are in view and describe the general scene context. Do not identify individuals."),
      )

  private val promptKeywords =
      listOf(
          "navigation" to listOf("\\b(navigat|direction|which way|turn left|turn right|street sign|crosswalk|intersection)\\b"),
          "accessibility" to listOf("\\b(read|text|menu|label|sign says|what does it say)\\b"),
          "safety" to listOf("\\b(safe|hazard|obstacle|curb|trip|danger|watch out)\\b"),
          "shopping" to listOf("\\b(price|product|shelf|buy|store|grocery|tag)\\b"),
          "social" to listOf("\\b(people|person|crowd|how many)\\b"),
          "scene" to listOf("\\b(describe|what am i looking at|what's in front|what is in front)\\b"),
      )

  fun preset(id: String): PromptPreset = all.firstOrNull { it.id == id } ?: all.first()

  fun inferPromptIdFromText(text: String): String? {
    val trimmed = text.trim()
    if (trimmed.isEmpty()) return null
    for ((id, patterns) in promptKeywords) {
      if (patterns.any { pattern -> Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(trimmed) }) {
        return id
      }
    }
    return null
  }

  fun resolve(
      mode: PromptMode,
      selectedPromptId: String,
      userText: String? = null,
  ): ResolvedVisionPrompt {
    if (mode == PromptMode.MANUAL) {
      val preset = preset(selectedPromptId)
      return ResolvedVisionPrompt(preset.id, preset.title, preset.prompt, inferred = false)
    }

    val inferredId = userText?.let(::inferPromptIdFromText)
    if (inferredId != null) {
      val preset = preset(inferredId)
      return ResolvedVisionPrompt(preset.id, preset.title, preset.prompt, inferred = true)
    }

    return ResolvedVisionPrompt(
        id = AUTO_PROMPT_ID,
        title = "Smart",
        prompt = AUTO_VISION_PROMPT,
        inferred = false,
    )
  }
}
