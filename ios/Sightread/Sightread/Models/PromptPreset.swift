import Foundation

enum PromptMode: String {
  case auto, manual
}

struct PromptPreset: Identifiable, Hashable {
  let id: String
  let title: String
  let prompt: String
}

struct ResolvedVisionPrompt {
  let id: String
  let title: String
  let prompt: String
  let inferred: Bool
}

enum PromptPresets {
  static let autoPromptId = "auto"

  static let autoVisionPrompt =
    "You are helping a visually impaired user understand their surroundings. In a few short, spoken-friendly sentences: describe the scene, read any important visible text, note hazards or obstacles, and mention anything useful for getting around. Be concise and practical."

  static let all: [PromptPreset] = [
    PromptPreset(id: "scene", title: "Describe scene", prompt: "Describe what I am looking at in 2 sentences. Be specific about objects and any visible text."),
    PromptPreset(id: "navigation", title: "Navigation", prompt: "Identify street signs, storefront names, and suggest which direction I should turn if relevant."),
    PromptPreset(id: "accessibility", title: "Read text", prompt: "Read any visible text in a clear, spoken-friendly way: menus, labels, and signs."),
    PromptPreset(id: "safety", title: "Safety check", prompt: "Flag hazards in my field of view: obstacles, curbs, vehicles, or uneven ground."),
    PromptPreset(id: "shopping", title: "Shopping", prompt: "Identify products on shelves and any visible price tags you can read."),
    PromptPreset(id: "social", title: "Scene context", prompt: "How many people are in view and describe the general scene context. Do not identify individuals."),
  ]

  private static let promptKeywords: [(id: String, patterns: [String])] = [
    ("navigation", ["\\b(navigat|direction|which way|turn left|turn right|street sign|crosswalk|intersection)\\b"]),
    ("accessibility", ["\\b(read|text|menu|label|sign says|what does it say)\\b"]),
    ("safety", ["\\b(safe|hazard|obstacle|curb|trip|danger|watch out)\\b"]),
    ("shopping", ["\\b(price|product|shelf|buy|store|grocery|tag)\\b"]),
    ("social", ["\\b(people|person|crowd|how many)\\b"]),
    ("scene", ["\\b(describe|what am i looking at|what's in front|what is in front)\\b"]),
  ]

  static func preset(id: String) -> PromptPreset { all.first { $0.id == id } ?? all[0] }

  static func inferPromptId(from text: String) -> String? {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    for entry in promptKeywords {
      for pattern in entry.patterns {
        if trimmed.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil {
          return entry.id
        }
      }
    }
    return nil
  }

  static func resolve(
    mode: PromptMode,
    selectedPromptId: String,
    userText: String? = nil
  ) -> ResolvedVisionPrompt {
    if mode == .manual {
      let preset = preset(id: selectedPromptId)
      return ResolvedVisionPrompt(id: preset.id, title: preset.title, prompt: preset.prompt, inferred: false)
    }

    if let userText, let inferredId = inferPromptId(from: userText) {
      let preset = preset(id: inferredId)
      return ResolvedVisionPrompt(id: preset.id, title: preset.title, prompt: preset.prompt, inferred: true)
    }

    return ResolvedVisionPrompt(
      id: autoPromptId,
      title: "Smart",
      prompt: autoVisionPrompt,
      inferred: false
    )
  }
}
