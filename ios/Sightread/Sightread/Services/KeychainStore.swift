import Foundation
import Security

enum KeychainStore {
  static func save(_ value: String, account: String) {
    let data = Data(value.utf8)
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account, kSecAttrService as String: "com.sightread.keys"]
    SecItemDelete(query as CFDictionary)
    var add = query; add[kSecValueData as String] = data
    SecItemAdd(add as CFDictionary, nil)
  }
  static func load(account: String) -> String? {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account, kSecAttrService as String: "com.sightread.keys", kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data, let s = String(data: data, encoding: .utf8), !s.isEmpty else { return nil }
    return s
  }
  static func delete(account: String) {
    SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account, kSecAttrService as String: "com.sightread.keys"] as CFDictionary)
  }
}