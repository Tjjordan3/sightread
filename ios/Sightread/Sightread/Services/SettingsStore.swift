import Foundation
import Observation

enum AIProvider: String, CaseIterable, Identifiable {
  case gemini, openai
  var id: String { rawValue }
  var displayName: String { self == .gemini ? "Gemini" : "OpenAI" }
}

@Observable @MainActor
final class SettingsStore {
  static let shared = SettingsStore()
  private enum Keys {
    static let provider = "sightread.ai.provider"
    static let promptId = "sightread.ai.promptId"
    static let interval = "sightread.ai.interval"
    static let aiEnabled = "sightread.ai.enabled"
    static let ttsEnabled = "sightread.tts.enabled"
    static let geminiKey = "sightread.key.gemini"
    static let openaiKey = "sightread.key.openai"
  }
  var provider: AIProvider { didSet { UserDefaults.standard.set(provider.rawValue, forKey: Keys.provider) } }
  var selectedPromptId: String { didSet { UserDefaults.standard.set(selectedPromptId, forKey: Keys.promptId) } }
  var analysisInterval: TimeInterval { didSet { UserDefaults.standard.set(analysisInterval, forKey: Keys.interval) } }
  var isAIEnabled: Bool { didSet { UserDefaults.standard.set(isAIEnabled, forKey: Keys.aiEnabled) } }
  var isTTSEnabled: Bool { didSet { UserDefaults.standard.set(isTTSEnabled, forKey: Keys.ttsEnabled) } }
  var geminiAPIKey: String { get { KeychainStore.load(account: Keys.geminiKey) ?? "" } set { newValue.isEmpty ? KeychainStore.delete(account: Keys.geminiKey) : KeychainStore.save(newValue, account: Keys.geminiKey) } }
  var openAIAPIKey: String { get { KeychainStore.load(account: Keys.openaiKey) ?? "" } set { newValue.isEmpty ? KeychainStore.delete(account: Keys.openaiKey) : KeychainStore.save(newValue, account: Keys.openaiKey) } }
  var selectedPrompt: PromptPreset { PromptPresets.preset(id: selectedPromptId) }
  var hasAPIKeyForCurrentProvider: Bool { provider == .gemini ? !geminiAPIKey.isEmpty : !openAIAPIKey.isEmpty }
  private init() {
    let d = UserDefaults.standard
    provider = AIProvider(rawValue: d.string(forKey: Keys.provider) ?? "") ?? .gemini
    selectedPromptId = d.string(forKey: Keys.promptId) ?? PromptPresets.all[0].id
    let iv = d.double(forKey: Keys.interval); analysisInterval = iv > 0 ? iv : 3
    isAIEnabled = d.object(forKey: Keys.aiEnabled) == nil ? true : d.bool(forKey: Keys.aiEnabled)
    isTTSEnabled = d.object(forKey: Keys.ttsEnabled) == nil ? false : d.bool(forKey: Keys.ttsEnabled)
  }
}