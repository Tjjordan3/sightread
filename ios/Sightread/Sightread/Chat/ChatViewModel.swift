import Foundation
import Observation
import UIKit

@Observable
@MainActor
final class ChatViewModel {
  var messages: [ChatMessage] = [
    ChatMessage(role: .assistant, text: "Ask me anything, or attach what you're seeing.")
  ]

  var draft: String = ""
  var isSending: Bool = false
  var errorMessage: String?

  private let settings: SettingsStore
  private var task: Task<Void, Never>?

  init(settings: SettingsStore = .shared) {
    self.settings = settings
  }

  func cancel() {
    task?.cancel()
    task = nil
    isSending = false
  }

  func send(attachedImage: UIImage?) {
    let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }
    guard settings.hasAPIKeyForCurrentProvider else {
      errorMessage = "Add your \(settings.provider.displayName) API key in Settings."
      return
    }

    errorMessage = nil
    let imageBytes = attachedImage.flatMap { ImageEncoding.jpegData(from: $0)?.count }
    let userMsg = ChatMessage(role: .user, text: trimmed, attachedImageBytes: imageBytes)
    messages.append(userMsg)
    draft = ""
    isSending = true

    let service = ChatAIServiceFactory.make(provider: settings.provider, settings: settings)
    let snapshot = messages

    task?.cancel()
    task = Task { [weak self] in
      guard let self else { return }
      do {
        let response = try await service.chat(messages: snapshot, attachedImage: attachedImage)
        guard !Task.isCancelled else { return }
        self.messages.append(ChatMessage(role: .assistant, text: response))
      } catch {
        guard !Task.isCancelled else { return }
        self.errorMessage = error.localizedDescription
      }
      self.isSending = false
    }
  }
}

