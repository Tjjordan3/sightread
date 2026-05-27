import MWDATCamera
import MWDATCore
import Observation
import SwiftUI

enum StreamingStatus { case streaming, waiting, stopped }

@Observable @MainActor
final class StreamSessionViewModel {
  var currentVideoFrame: UIImage?
  var hasReceivedFirstFrame: Bool = false
  var streamingStatus: StreamingStatus = .stopped
  var showError: Bool = false
  var errorMessage: String = ""
  var requiresDATAppUpdate: Bool = false
  var capturedPhoto: UIImage?
  var showPhotoPreview: Bool = false
  var showPhotoCaptureError: Bool = false
  var isCapturingPhoto: Bool = false
  let aiViewModel: AIAnalysisViewModel

  var hasActiveDevice: Bool { sessionManager.hasActiveDevice }
  var isDeviceSessionReady: Bool { sessionManager.isReady }
  var isStreaming: Bool { streamingStatus != .stopped }

  private let sessionManager: DeviceSessionManager
  private let wearables: WearablesInterface
  private let settings: SettingsStore
  private var stream: MWDATCamera.Stream?
  private var stateListenerToken: AnyListenerToken?
  private var videoFrameListenerToken: AnyListenerToken?
  private var errorListenerToken: AnyListenerToken?
  private var photoDataListenerToken: AnyListenerToken?

  init(
    wearables: WearablesInterface,
    aiViewModel: AIAnalysisViewModel = AIAnalysisViewModel(),
    settings: SettingsStore = .shared
  ) {
    self.wearables = wearables
    self.sessionManager = DeviceSessionManager(wearables: wearables)
    self.aiViewModel = aiViewModel
    self.settings = settings
  }

  func handleStartStreaming() async {
    let permission = Permission.camera
    do {
      var status = try await wearables.checkPermissionStatus(permission)
      if status != .granted { status = try await wearables.requestPermission(permission) }
      guard status == .granted else { showError("Permission denied"); return }
      await startSession()
    } catch { showError("Permission error: \(error.description)") }
  }

  func stopSession() async {
    aiViewModel.reset()
    AudioRouteManager.deactivate()
    guard let activeStream = stream else { return }
    stream = nil
    clearListeners()
    streamingStatus = .stopped
    currentVideoFrame = nil
    hasReceivedFirstFrame = false
    await activeStream.stop()
  }

  func endSession() {
    aiViewModel.reset()
    stream = nil
    clearListeners()
    streamingStatus = .stopped
    currentVideoFrame = nil
    hasReceivedFirstFrame = false
    sessionManager.cleanup()
  }

  func capturePhoto() {
    guard !isCapturingPhoto, streamingStatus == .streaming else { showPhotoCaptureError = true; return }
    isCapturingPhoto = true
    let success = stream?.capturePhoto(format: .jpeg) ?? false
    if !success { isCapturingPhoto = false; showPhotoCaptureError = true }
  }

  func analyzeCurrentFrame() {
    guard let image = currentVideoFrame else { return }
    aiViewModel.analyzeNow(image: image)
  }

  func dismissError() { showError = false; errorMessage = "" }
  func dismissPhotoCaptureError() { showPhotoCaptureError = false }
  func dismissPhotoPreview() { showPhotoPreview = false; capturedPhoto = nil }

  private func startSession() async {
    let deviceSession: DeviceSession
    do {
      deviceSession = try await sessionManager.getSession()
      requiresDATAppUpdate = false
    } catch DeviceSessionError.datAppOnTheGlassesUpdateRequired {
      requiresDATAppUpdate = true
      showError(DeviceSessionError.datAppOnTheGlassesUpdateRequired.localizedDescription)
      return
    } catch {
      showError("Failed to start session: \(error.localizedDescription)")
      return
    }
    guard deviceSession.state == .started else { showError("Device session is not ready."); return }

    if settings.isTTSEnabled {
      do {
        try AudioRouteManager.configureForGlassesHFP()
        try await Task.sleep(nanoseconds: 2_000_000_000)
      } catch {
        showError("Could not route audio to glasses: \(error.localizedDescription)")
        return
      }
    }

    let config = StreamConfiguration(videoCodec: VideoCodec.raw, resolution: StreamingResolution.low, frameRate: 15)
    guard let newStream = try? deviceSession.addStream(config: config) else { return }
    stream = newStream
    streamingStatus = .waiting
    setupListeners(for: newStream)
    await newStream.start()
  }

  private func setupListeners(for stream: MWDATCamera.Stream) {
    stateListenerToken = stream.statePublisher.listen { [weak self] state in Task { @MainActor in self?.handleStateChange(state) } }
    videoFrameListenerToken = stream.videoFramePublisher.listen { [weak self] frame in Task { @MainActor in self?.handleVideoFrame(frame) } }
    errorListenerToken = stream.errorPublisher.listen { [weak self] error in Task { @MainActor in self?.handleError(error) } }
    photoDataListenerToken = stream.photoDataPublisher.listen { [weak self] data in Task { @MainActor in self?.handlePhotoData(data) } }
  }

  private func clearListeners() {
    stateListenerToken = nil; videoFrameListenerToken = nil; errorListenerToken = nil; photoDataListenerToken = nil
  }

  private func handleStateChange(_ state: StreamState) {
    switch state {
    case .stopped: currentVideoFrame = nil; streamingStatus = .stopped; aiViewModel.reset()
    case .waitingForDevice, .starting, .stopping, .paused: streamingStatus = .waiting
    case .streaming: streamingStatus = .streaming
    }
  }

  private func handleVideoFrame(_ frame: VideoFrame) {
    guard let image = frame.makeUIImage() else { return }
    currentVideoFrame = image
    if !hasReceivedFirstFrame { hasReceivedFirstFrame = true }
    if streamingStatus == .streaming { aiViewModel.processFrame(image) }
  }

  private func handleError(_ error: StreamError) {
    let message = error.localizedDescription
    if message != errorMessage { showError(message) }
  }

  private func handlePhotoData(_ data: PhotoData) {
    isCapturingPhoto = false
    if let image = UIImage(data: data.data) { capturedPhoto = image; showPhotoPreview = true }
  }

  private func showError(_ message: String) { errorMessage = message; showError = true }
}