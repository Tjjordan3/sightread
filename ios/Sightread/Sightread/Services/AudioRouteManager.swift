//
// Routes audio to Ray-Ban Meta glasses over Bluetooth HFP for TTS playback.
//

import AVFoundation
import Foundation

enum AudioRouteManager {
  /// Configure HFP before starting a stream that uses glasses speakers (per Meta DAT guidance).
  static func configureForGlassesHFP() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .default,
      options: [.allowBluetooth, .defaultToSpeaker]
    )
    try session.setActive(true, options: [])
  }

  static func deactivate() {
    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: .notifyOthersOnDeactivation
    )
  }
}
