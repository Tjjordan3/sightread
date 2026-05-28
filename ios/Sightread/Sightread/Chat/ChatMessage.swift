import Foundation

enum ChatRole: String, Codable {
  case user
  case assistant
}

struct ChatMessage: Identifiable, Codable, Hashable {
  let id: UUID
  let role: ChatRole
  var text: String
  let timestamp: Date
  var attachedImageBytes: Int?

  init(role: ChatRole, text: String, timestamp: Date = Date(), attachedImageBytes: Int? = nil) {
    self.id = UUID()
    self.role = role
    self.text = text
    self.timestamp = timestamp
    self.attachedImageBytes = attachedImageBytes
  }
}

