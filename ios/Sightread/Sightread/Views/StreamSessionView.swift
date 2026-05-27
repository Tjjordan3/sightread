import MWDATCore
import SwiftUI

struct StreamSessionView: View {
  let wearables: WearablesInterface
  var wearablesViewModel: WearablesViewModel
  @State private var viewModel: StreamSessionViewModel
  @Bindable private var settings = SettingsStore.shared
  @Environment(\.scenePhase) private var scenePhase

  init(wearables: WearablesInterface, wearablesVM: WearablesViewModel) {
    self.wearables = wearables
    self.wearablesViewModel = wearablesVM
    self._viewModel = State(wrappedValue: StreamSessionViewModel(wearables: wearables))
  }

  var body: some View {
    ZStack {
      if viewModel.isStreaming {
        StreamView(viewModel: viewModel, wearablesVM: wearablesViewModel, settings: settings)
      } else {
        NonStreamView(viewModel: viewModel, wearablesVM: wearablesViewModel, settings: settings)
      }
    }
    .onDisappear { viewModel.endSession() }
    .onChange(of: scenePhase) { _, phase in
      if phase == .background, viewModel.isStreaming {
        Task { await viewModel.stopSession() }
      }
    }
    .alert("Error", isPresented: $viewModel.showError) {
      Button("OK") { viewModel.dismissError() }
    } message: { Text(viewModel.errorMessage) }
    .alert("Photo capture failed", isPresented: $viewModel.showPhotoCaptureError) {
      Button("OK") { viewModel.dismissPhotoCaptureError() }
    } message: {
      Text("Unable to capture photo. Try again in a moment.")
    }
  }
}
