import Foundation

struct GroqVisionService: VisionAIService {
  let apiKey: String
  private let model = "meta-llama/llama-4-scout-17b-16e-instruct"

  func analyze(jpegData: Data, prompt: String) async throws -> String {
    guard !apiKey.isEmpty else { throw VisionAIError.missingAPIKey }
    let base64 = jpegData.base64EncodedString()
    guard let url = URL(string: "https://api.groq.com/openai/v1/chat/completions") else { throw VisionAIError.invalidResponse }
    let body: [String: Any] = [
      "model": model, "max_tokens": 300,
      "messages": [["role": "user", "content": [
        ["type": "text", "text": prompt],
        ["type": "image_url", "image_url": ["url": "data:image/jpeg;base64,\(base64)"]],
      ]]],
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
          let text = message["content"] as? String, !text.isEmpty else { throw VisionAIError.invalidResponse }
    return text.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
