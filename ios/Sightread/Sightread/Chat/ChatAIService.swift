import Foundation
import UIKit

protocol ChatAIService: Sendable {
  func chat(messages: [ChatMessage], attachedImage: UIImage?) async throws -> String
}

enum ChatAIServiceFactory {
  static func make(provider: AIProvider, settings: SettingsStore) -> ChatAIService {
    switch provider {
    case .gemini:
      return GeminiChatService(apiKey: settings.geminiAPIKey)
    case .openai:
      return OpenAIChatService(apiKey: settings.openAIAPIKey)
    }
  }
}

private func buildTranscript(messages: [ChatMessage]) -> String {
  // MVP: providers have different native multi-turn formats; keep it consistent and simple.
  messages
    .suffix(20)
    .map { msg in
      let prefix = msg.role == .user ? "User" : "Assistant"
      return "\(prefix): \(msg.text)"
    }
    .joined(separator: "\n")
}

struct GeminiChatService: ChatAIService {
  let apiKey: String
  private let model = "gemini-2.0-flash"

  func chat(messages: [ChatMessage], attachedImage: UIImage?) async throws -> String {
    guard !apiKey.isEmpty else { throw VisionAIError.missingAPIKey }

    guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)") else {
      throw VisionAIError.invalidResponse
    }

    var parts: [[String: Any]] = [
      ["text": buildTranscript(messages: messages)]
    ]

    if let image = attachedImage,
       let jpeg = ImageEncoding.jpegData(from: image, maxWidth: 512, quality: 0.6) {
      parts.append([
        "inline_data": [
          "mime_type": "image/jpeg",
          "data": jpeg.base64EncodedString(),
        ]
      ])
    }

    let body: [String: Any] = [
      "contents": [
        [
          "parts": parts
        ]
      ]
    ]

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let code = (response as? HTTPURLResponse)?.statusCode ?? -1
      throw VisionAIError.httpError(code, String(data: data, encoding: .utf8) ?? "")
    }

    guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let candidates = json["candidates"] as? [[String: Any]],
          let content = candidates.first?["content"] as? [String: Any],
          let responseParts = content["parts"] as? [[String: Any]] else {
      throw VisionAIError.invalidResponse
    }

    let text = responseParts.compactMap { $0["text"] as? String }.joined()
    guard !text.isEmpty else { throw VisionAIError.invalidResponse }
    return text.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

struct OpenAIChatService: ChatAIService {
  let apiKey: String
  private let model = "gpt-4o-mini"

  func chat(messages: [ChatMessage], attachedImage: UIImage?) async throws -> String {
    guard !apiKey.isEmpty else { throw VisionAIError.missingAPIKey }
    guard let url = URL(string: "https://api.openai.com/v1/chat/completions") else { throw VisionAIError.invalidResponse }

    // MVP: send last N turns as plain text; optionally attach an image with the latest user turn.
    let transcript = buildTranscript(messages: messages)

    var userContent: [Any] = [
      ["type": "text", "text": transcript]
    ]

    if let image = attachedImage,
       let jpeg = ImageEncoding.jpegData(from: image, maxWidth: 512, quality: 0.6) {
      userContent.append([
        "type": "image_url",
        "image_url": [
          "url": "data:image/jpeg;base64,\(jpeg.base64EncodedString())",
          "detail": "low"
        ]
      ])
    }

    let body: [String: Any] = [
      "model": model,
      "max_tokens": 400,
      "messages": [
        [
          "role": "user",
          "content": userContent
        ]
      ],
    ]

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
      let code = (response as? HTTPURLResponse)?.statusCode ?? -1
      throw VisionAIError.httpError(code, String(data: data, encoding: .utf8) ?? "")
    }

    guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let choices = json["choices"] as? [[String: Any]],
          let message = choices.first?["message"] as? [String: Any],
          let text = message["content"] as? String, !text.isEmpty else {
      throw VisionAIError.invalidResponse
    }
    return text.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

