import Foundation

actor FrameSampler {
  private var lastSampleTime: Date?
  private var isProcessing = false
  func shouldSample(interval: TimeInterval) -> Bool {
    guard !isProcessing else { return false }
    let now = Date()
    if let last = lastSampleTime, now.timeIntervalSince(last) < interval { return false }
    lastSampleTime = now
    return true
  }
  func beginProcessing() { isProcessing = true }
  func endProcessing() { isProcessing = false }
  func reset() { lastSampleTime = nil; isProcessing = false }
}