package com.meta.wearable.dat.externalsampleapps.sightread.ai

data class PromptPreset(val id: String, val title: String, val prompt: String)

object PromptPresets {
  val all =
      listOf(
          PromptPreset("scene", "Describe scene", "Describe what I am looking at in 2 sentences. Be specific about objects and any visible text."),
          PromptPreset("navigation", "Navigation", "Identify street signs, storefront names, and suggest which direction I should turn if relevant."),
          PromptPreset("accessibility", "Read text", "Read any visible text in a clear, spoken-friendly way: menus, labels, and signs."),
          PromptPreset("safety", "Safety check", "Flag hazards in my field of view: obstacles, curbs, vehicles, or uneven ground."),
          PromptPreset("shopping", "Shopping", "Identify products on shelves and any visible price tags you can read."),
          PromptPreset("social", "Scene context", "How many people are in view and describe the general scene context. Do not identify individuals."),
      )

  fun preset(id: String): PromptPreset = all.firstOrNull { it.id == id } ?: all.first()
}
