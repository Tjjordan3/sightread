import SwiftUI

struct ChatView: View {
  @Bindable var settings: SettingsStore
  let getCurrentFrame: () -> UIImage?

  @Environment(\.dismiss) private var dismiss
  @State private var viewModel: ChatViewModel
  @State private var attachFrame: Bool = false

  init(settings: SettingsStore, getCurrentFrame: @escaping () -> UIImage?) {
    self.settings = settings
    self.getCurrentFrame = getCurrentFrame
    self._viewModel = State(initialValue: ChatViewModel(settings: settings))
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if let error = viewModel.errorMessage {
          Text(error)
            .font(.footnote)
            .foregroundStyle(.white)
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.red.opacity(0.7))
        }

        List {
          ForEach(viewModel.messages) { msg in
            HStack {
              if msg.role == .assistant { Spacer(minLength: 32) }
              VStack(alignment: .leading, spacing: 4) {
                Text(msg.role == .user ? "You" : settings.provider.displayName)
                  .font(.caption2)
                  .foregroundStyle(.secondary)
                Text(msg.text)
                  .font(.body)
                if let bytes = msg.attachedImageBytes {
                  Text("Attached frame (\(bytes) bytes)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
              }
              .padding(10)
              .background(msg.role == .user ? Color.blue.opacity(0.12) : Color.gray.opacity(0.12))
              .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
              if msg.role == .user { Spacer(minLength: 32) }
            }
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
          }

          if viewModel.isSending {
            HStack {
              ProgressView()
              Text("Thinking…")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
          }
        }
        .listStyle(.plain)

        Divider()

        VStack(spacing: 8) {
          Toggle("Attach current frame", isOn: $attachFrame)
            .font(.footnote)

          HStack(spacing: 8) {
            TextField("Message", text: $viewModel.draft, axis: .vertical)
              .textFieldStyle(.roundedBorder)
              .lineLimit(1...4)

            Button("Send") {
              viewModel.send(attachedImage: attachFrame ? getCurrentFrame() : nil)
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isSending || !settings.hasAPIKeyForCurrentProvider)
          }
          if !settings.hasAPIKeyForCurrentProvider {
            Text("Add your \(settings.provider.displayName) API key in Settings to chat.")
              .font(.caption2)
              .foregroundStyle(.secondary)
              .frame(maxWidth: .infinity, alignment: .leading)
          }
        }
        .padding(12)
      }
      .navigationTitle("Chat")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") { dismiss() }
        }
      }
    }
  }
}

