import SwiftUI

struct AIResponsePanel: View {
  var aiViewModel: AIAnalysisViewModel
  var settings: SettingsStore
  @State private var showHistory = false

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Label("Sightread AI", systemImage: "sparkles")
          .font(.subheadline.weight(.semibold))
        Spacer()
        analysisBadge
        if !aiViewModel.responses.isEmpty {
          Button(showHistory ? "Hide" : "History") {
            withAnimation { showHistory.toggle() }
          }
          .font(.caption)
        }
      }

      if !settings.isAIEnabled {
        Text("AI analysis paused")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else if case .error(let msg) = aiViewModel.analysisState {
        Text(msg)
          .font(.subheadline)
          .foregroundStyle(.orange)
      } else if !aiViewModel.latestResponse.isEmpty {
        Text(aiViewModel.latestResponse)
          .font(.subheadline)
          .lineLimit(showHistory ? nil : 5)
      } else {
        Text("Waiting for frames...")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      HStack {
        Text(settings.visionPrompt.title)
          .font(.caption2)
          .foregroundStyle(.secondary)
        if settings.isTTSEnabled {
          Label("TTS on", systemImage: "speaker.wave.2.fill")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      if showHistory {
        Divider()
        ForEach(aiViewModel.responses) { entry in
          VStack(alignment: .leading, spacing: 2) {
            Text(entry.promptTitle)
              .font(.caption2.weight(.semibold))
            Text(entry.text)
              .font(.caption)
              .lineLimit(3)
          }
          .padding(.vertical, 2)
        }
      }
    }
    .padding(12)
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    .padding(.horizontal, 12)
  }

  @ViewBuilder
  private var analysisBadge: some View {
    switch aiViewModel.analysisState {
    case .idle:
      Circle().fill(Color.green).frame(width: 8, height: 8)
    case .running:
      ProgressView().scaleEffect(0.7)
    case .error:
      Image(systemName: "exclamationmark.triangle.fill")
        .foregroundStyle(.orange)
        .font(.caption)
    }
  }
}
