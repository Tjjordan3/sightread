import MWDATCore
import SwiftUI

struct StreamView: View {
  @Bindable var viewModel: StreamSessionViewModel
  var wearablesVM: WearablesViewModel
  @Bindable var settings: SettingsStore
  @State private var showSettings = false
  @State private var showChat = false

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      if let videoFrame = viewModel.currentVideoFrame, viewModel.hasReceivedFirstFrame {
        GeometryReader { geometry in
          Image(uiImage: videoFrame)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: geometry.size.width, height: geometry.size.height)
            .clipped()
        }
        .ignoresSafeArea()
      } else {
        ProgressView().scaleEffect(1.5).tint(.white)
      }

      VStack(spacing: 0) {
        HStack {
          Text("Target: 720p/30 (may auto-adjust)")
            .font(.caption2)
            .foregroundStyle(.white.opacity(0.75))
            .padding(.leading, 16)
          Spacer()
          Button { showChat = true } label: {
            Image(systemName: "message.fill")
              .font(.title3)
              .foregroundStyle(.white)
              .padding(10)
              .background(.black.opacity(0.45), in: Circle())
          }
          Button { showSettings = true } label: {
            Image(systemName: "gearshape.fill").font(.title3).foregroundStyle(.white)
              .padding(10).background(.black.opacity(0.45), in: Circle())
          }
        }
        .padding(.horizontal, 16).padding(.top, 8)

        if viewModel.streamingStatus == .streaming {
          AIResponsePanel(aiViewModel: viewModel.aiViewModel, settings: settings)
            .padding(.top, 4)
        }

        Spacer()
        ControlsView(viewModel: viewModel)
      }
      .padding(.bottom, 24)
    }
    .onDisappear {
      Task {
        if viewModel.streamingStatus != .stopped { await viewModel.stopSession() }
      }
    }
    .sheet(isPresented: $showSettings) { SettingsView(settings: settings) }
    .sheet(isPresented: $showChat) {
      ChatView(
        settings: settings,
        getCurrentFrame: { viewModel.currentVideoFrame }
      )
    }
    .sheet(isPresented: $viewModel.showPhotoPreview) {
      if let photo = viewModel.capturedPhoto {
        PhotoPreviewView(photo: photo) { viewModel.dismissPhotoPreview() }
      }
    }
  }
}

struct ControlsView: View {
  var viewModel: StreamSessionViewModel

  var body: some View {
    VStack(spacing: 10) {
      HStack(spacing: 8) {
        CustomButton(title: "Stop", style: .destructive, isDisabled: false) {
          Task { await viewModel.stopSession() }
        }
        CustomButton(title: "Analyze now", style: .primary, isDisabled: false) {
          viewModel.analyzeCurrentFrame()
        }
        CircleButton(icon: "camera.fill", text: nil) { viewModel.capturePhoto() }
      }
    }
  }
}