import Foundation

struct PromptPreset: Identifiable, Hashable {
  let id: String
  let title: String
  let prompt: String
}

enum PromptPresets {
  static let all: [PromptPreset] = [
    PromptPreset(id: "scene", title: "Describe scene", prompt: "Describe what I am looking at in 2 sentences. Be specific about objects and any visible text."),
    PromptPreset(id: "navigation", title: "Navigation", prompt: "Identify street signs, storefront names, and suggest which direction I should turn if relevant."),
    PromptPreset(id: "accessibility", title: "Read text", prompt: "Read any visible text in a clear, spoken-friendly way: menus, labels, and signs."),
    PromptPreset(id: "safety", title: "Safety check", prompt: "Flag hazards in my field of view: obstacles, curbs, vehicles, or uneven ground."),
    PromptPreset(id: "shopping", title: "Shopping", prompt: "Identify products on shelves and any visible price tags you can read."),
    PromptPreset(id: "social", title: "Scene context", prompt: "How many people are in view and describe the general scene context. Do not identify individuals."),
  ]
  static func preset(id: String) -> PromptPreset { all.first { $0.id == id } ?? all[0] }
}