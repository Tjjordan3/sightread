//
// Reads AI responses aloud via AVSpeechSynthesizer (routed to glasses when HFP is active).
//

import AVFoundation
import Foundation

@MainActor
final class SpeechService {
  static let shared = SpeechService()

  private let synthesizer = AVSpeechSynthesizer()

  private init() {}

  func speak(_ text: String) {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    if synthesizer.isSpeaking {
      synthesizer.stopSpeaking(at: .immediate)
    }

    let utterance = AVSpeechUtterance(string: trimmed)
    utterance.rate = AVSpeechUtteranceDefaultSpeechRate
    utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
    synthesizer.speak(utterance)
  }

  func stop() {
    if synthesizer.isSpeaking {
      synthesizer.stopSpeaking(at: .immediate)
    }
  }
}
