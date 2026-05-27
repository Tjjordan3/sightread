import MWDATCore
import SwiftUI

struct HomeScreenView: View {
  var viewModel: WearablesViewModel

  var body: some View {
    ZStack {
      Color.white.ignoresSafeArea()
      VStack(spacing: 12) {
        Spacer()
        Image(.cameraAccessIcon)
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 120)
        Text("Sightread")
          .font(.largeTitle.bold())
        Text("Read the world through your frames")
          .font(.subheadline)
          .foregroundStyle(.gray)
          .multilineTextAlignment(.center)
        VStack(spacing: 12) {
          HomeTipItemView(resource: .smartGlassesIcon, title: "Live vision", text: "Stream your point of view and understand the scene with AI.")
          HomeTipItemView(resource: .soundIcon, title: "Smart prompts", text: "Presets for navigation, safety, reading text, and more.")
          HomeTipItemView(resource: .walkingIcon, title: "Ray-Ban Meta", text: "Connect via Meta Wearables Device Access Toolkit.")
        }
        Spacer()
        VStack(spacing: 20) {
          Text("You will be redirected to the Meta AI app to confirm your connection.")
            .font(.footnote)
            .foregroundStyle(.gray)
            .multilineTextAlignment(.center)
          CustomButton(
            title: viewModel.registrationState == .registering ? "Connecting..." : "Connect my glasses",
            style: .primary,
            isDisabled: viewModel.registrationState == .registering
          ) { viewModel.connectGlasses() }
        }
      }
      .padding(24)
    }
  }
}

struct HomeTipItemView: View {
  let resource: ImageResource
  let title: String
  let text: String
  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Image(resource).resizable().renderingMode(.template).foregroundStyle(.black)
        .aspectRatio(contentMode: .fit).frame(width: 24).padding(.leading, 4).padding(.top, 4)
      VStack(alignment: .leading, spacing: 6) {
        Text(title).font(.headline)
        Text(text).font(.subheadline).foregroundStyle(.gray)
      }
      Spacer()
    }
  }
}