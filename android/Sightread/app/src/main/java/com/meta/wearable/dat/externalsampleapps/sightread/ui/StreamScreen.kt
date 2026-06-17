package com.meta.wearable.dat.externalsampleapps.sightread.ui

import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.meta.wearable.dat.camera.types.StreamState
import com.meta.wearable.dat.externalsampleapps.sightread.R
import com.meta.wearable.dat.externalsampleapps.sightread.ai.SettingsRepository
import com.meta.wearable.dat.externalsampleapps.sightread.stream.StreamViewModel
import com.meta.wearable.dat.externalsampleapps.sightread.wearables.WearablesViewModel

@Composable
fun StreamScreen(
    wearablesViewModel: WearablesViewModel,
    modifier: Modifier = Modifier,
    streamViewModel: StreamViewModel =
        viewModel(
            factory =
                StreamViewModel.Factory(
                    application = (LocalActivity.current as ComponentActivity).application,
                    wearablesViewModel = wearablesViewModel,
                ),
        ),
) {
  val streamUiState by streamViewModel.uiState.collectAsStateWithLifecycle()
  val aiState by streamViewModel.aiController.uiState.collectAsStateWithLifecycle()
  val settings = remember { SettingsRepository(LocalContext.current) }
  var showChat by remember { mutableStateOf(false) }
  val hasApiKey = remember(settings.provider) { settings.hasApiKeyForCurrentProvider() }

  LaunchedEffect(Unit) {
    streamViewModel.prepareForStreaming()
    streamViewModel.startStream()
  }

  Box(modifier = modifier.fillMaxSize()) {
    streamUiState.videoFrame?.let { videoFrame ->
      key(streamUiState.videoFrameCount) {
        Image(
            bitmap = videoFrame.asImageBitmap(),
            contentDescription = stringResource(R.string.live_stream),
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
      }
    }
    if (streamUiState.streamState == StreamState.STARTING) {
      CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
    }

    Column(modifier = Modifier.fillMaxSize().padding(top = 8.dp)) {
      Row(
          modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically,
      ) {
        Text(
            text = "Target: 720p/30 (may auto-adjust)",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        IconButton(onClick = { showChat = true }) {
          Icon(Icons.Default.Chat, contentDescription = "Chat")
        }
      }
      if (streamUiState.streamState == StreamState.STREAMING) {
        AIResponsePanel(
            aiState = aiState,
            promptTitle = settings.visionPrompt.title,
            ttsEnabled = settings.isTTSEnabled,
        )
      }
      Box(modifier = Modifier.weight(1f))
      Row(
          modifier =
              Modifier.fillMaxWidth()
                  .navigationBarsPadding()
                  .padding(24.dp)
                  .height(56.dp),
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically,
      ) {
        SwitchButton(
            label = stringResource(R.string.stop_stream_button_title),
            onClick = {
              streamViewModel.stopStream()
              wearablesViewModel.navigateToDeviceSelection()
            },
            isDestructive = true,
            modifier = Modifier.weight(1f),
        )
        SwitchButton(
            label = stringResource(R.string.analyze_now_button),
            onClick = { streamViewModel.analyzeCurrentFrame() },
            modifier = Modifier.weight(1f),
            enabled = hasApiKey,
        )
        CaptureButton(onClick = { streamViewModel.capturePhoto() })
      }
      if (!hasApiKey) {
        Text(
            text = "Add an API key in AI Settings to use AI.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp),
        )
      }
    }
  }

  streamUiState.capturedPhoto?.let { photo ->
    if (streamUiState.isShareDialogVisible) {
      SharePhotoDialog(
          photo = photo,
          onDismiss = { streamViewModel.hideShareDialog() },
          onShare = { bitmap ->
            streamViewModel.sharePhoto(bitmap)
            streamViewModel.hideShareDialog()
          },
      )
    }
  }

  if (showChat) {
    ModalBottomSheet(onDismissRequest = { showChat = false }) {
      ChatScreen(
          getCurrentFrame = { streamUiState.videoFrame },
          onClose = { showChat = false },
          modifier = Modifier.fillMaxSize(),
      )
    }
  }
}
