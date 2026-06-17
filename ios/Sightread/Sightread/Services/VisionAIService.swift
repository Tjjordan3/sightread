import Foundation
import UIKit

protocol VisionAIService: Sendable {
  func analyze(jpegData: Data, prompt: String) async throws -> String
}

enum VisionAIError: LocalizedError {
  case missingAPIKey, invalidResponse
  case httpError(Int, String)
  var errorDescription: String? {
    switch self {
    case .missingAPIKey: return "Add an API key in Settings."
    case .invalidResponse: return "Could not parse the AI response."
    case .httpError(let c, let b): return "API error \(c): \(b)"
    }
  }
}

enum VisionAIServiceFactory {
  static func make(provider: AIProvider, settings: SettingsStore) -> VisionAIService {
    switch provider {
    case .gemini: return GeminiVisionService(apiKey: settings.geminiAPIKey)
    case .openai: return OpenAIVisionService(apiKey: settings.openAIAPIKey)
    case .groq: return GroqVisionService(apiKey: settings.groqAPIKey)
    }
  }
}

enum ImageEncoding {
  static func jpegData(from image: UIImage, maxWidth: CGFloat = 512, quality: CGFloat = 0.6) -> Data? {
    let size = image.size
    guard size.width > 0, size.height > 0 else { return nil }
    let scale = min(1, maxWidth / size.width)
    let target = CGSize(width: size.width * scale, height: size.height * scale)
    let resized = UIGraphicsImageRenderer(size: target).image { _ in image.draw(in: CGRect(origin: .zero, size: target)) }
    return resized.jpegData(compressionQuality: quality)
  }
}