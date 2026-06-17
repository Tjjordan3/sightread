import SwiftUI

struct SettingsView: View {
  @Bindable var settings: SettingsStore
  @Environment(\.dismiss) private var dismiss
  @State private var geminiKey = ""
  @State private var openAIKey = ""
  @State private var groqKey = ""

  var body: some View {
    NavigationStack {
      Form {
        Section("Vision AI") {
          Toggle("Enable AI analysis", isOn: $settings.isAIEnabled)
          Toggle("Read responses aloud (glasses speakers)", isOn: $settings.isTTSEnabled)
          Picker("Provider", selection: $settings.provider) {
            ForEach(AIProvider.allCases) { Text($0.displayName).tag($0) }
          }
          Picker("Prompt preset", selection: $settings.selectedPromptId) {
            ForEach(PromptPresets.all) { Text($0.title).tag($0.id) }
          }
          Stepper(value: $settings.analysisInterval, in: 2...10, step: 1) {
            Text("Analyze every \(Int(settings.analysisInterval))s")
          }
        }
        Section("API keys (stored in Keychain)") {
          SecureField("Gemini API key", text: $geminiKey)
          SecureField("OpenAI API key", text: $openAIKey)
          SecureField("Groq API key", text: $groqKey)
          Text("Get a free Gemini key at aistudio.google.com").font(.caption).foregroundStyle(.secondary)
          Text("Get a Groq key at console.groq.com").font(.caption).foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Settings")
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") {
            settings.geminiAPIKey = geminiKey
            settings.openAIAPIKey = openAIKey
            settings.groqAPIKey = groqKey
            dismiss()
          }
        }
      }
      .onAppear {
        geminiKey = settings.geminiAPIKey
        openAIKey = settings.openAIAPIKey
        groqKey = settings.groqAPIKey
      }
    }
  }
}