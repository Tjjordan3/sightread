import Foundation

struct GeminiVisionService: VisionAIService {
  let apiKey: String
  private let model = "gemini-2.0-flash"

  func analyze(jpegData: Data, prompt: String) async throws -> String {
    guard !apiKey.isEmpty else { throw VisionAIError.missingAPIKey }
    let base64 = jpegData.base64EncodedString()
    guard let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/\(model):generateContent?key=\(apiKey)") else { throw VisionAIError.invalidResponse }
    let body: [String: Any] = ["contents": [["parts": [["text": prompt], ["inline_data": ["mime_type": "image/jpeg", "data": base64]]]]]]
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
          let parts = content["parts"] as? [[String: Any]] else { throw VisionAIError.invalidResponse }
    let text = parts.compactMap { $0["text"] as? String }.joined()
    guard !text.isEmpty else { throw VisionAIError.invalidResponse }
    return text.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}