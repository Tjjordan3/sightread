import Foundation
import Observation
import UIKit

enum AnalysisState: Equatable {
  case idle, running
  case error(String)
}

struct AIResponseEntry: Identifiable {
  let id = UUID()
  let text: String
  let promptTitle: String
  let timestamp: Date
}

@Observable @MainActor
final class AIAnalysisViewModel {
  var analysisState: AnalysisState = .idle
  var responses: [AIResponseEntry] = []
  var latestResponse: String = ""
  private let settings: SettingsStore
  private let frameSampler = FrameSampler()
  private var analysisTask: Task<Void, Never>?

  init(settings: SettingsStore = .shared) { self.settings = settings }

  func reset() {
    analysisTask?.cancel()
    analysisTask = nil
    Task { await frameSampler.reset() }
    analysisState = .idle
    SpeechService.shared.stop()
  }

  func processFrame(_ image: UIImage) {
    guard settings.isAIEnabled else { return }
    guard settings.hasAPIKeyForCurrentProvider else {
      if case .error = analysisState {} else {
        analysisState = .error("Add your \(settings.provider.displayName) API key in Settings.")
      }
      return
    }
    analysisTask?.cancel()
    analysisTask = Task { [weak self] in
      await self?.runAnalysis(image: image, promptLabel: nil, isManual: false)
    }
  }

  func analyzeNow(image: UIImage) {
    analysisTask?.cancel()
    analysisTask = Task { [weak self] in
      guard let self else { return }
      await frameSampler.reset()
      await runAnalysis(image: image, promptLabel: " (now)", isManual: true)
    }
  }

  private func runAnalysis(image: UIImage, promptLabel: String?, isManual: Bool) async {
    guard settings.hasAPIKeyForCurrentProvider else {
      analysisState = .error("Add your \(settings.provider.displayName) API key in Settings.")
      return
    }

    if !isManual {
      guard await frameSampler.shouldSample(interval: settings.analysisInterval) else { return }
    }

    let maxWidth: CGFloat = isManual ? 768 : 512
    let quality: CGFloat = isManual ? 0.75 : 0.6
    guard let jpeg = ImageEncoding.jpegData(from: image, maxWidth: maxWidth, quality: quality) else { return }

    await frameSampler.beginProcessing()
    analysisState = .running

    do {
      let service = VisionAIServiceFactory.make(provider: settings.provider, settings: settings)
      let result = try await service.analyze(jpegData: jpeg, prompt: settings.selectedPrompt.prompt)
      guard !Task.isCancelled else { return }

      applyResult(result, promptSuffix: promptLabel)
      analysisState = .idle
    } catch {
      guard !Task.isCancelled else { return }
      analysisState = .error(error.localizedDescription)
    }

    await frameSampler.endProcessing()
  }

  private func applyResult(_ result: String, promptSuffix: String?) {
    latestResponse = result
    let title = settings.selectedPrompt.title + (promptSuffix ?? "")
    responses.insert(
      AIResponseEntry(text: result, promptTitle: title, timestamp: Date()),
      at: 0
    )
    if responses.count > 10 { responses.removeLast() }

    if settings.isTTSEnabled {
      SpeechService.shared.speak(result)
    }
  }
}
